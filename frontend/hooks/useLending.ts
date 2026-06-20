"use client";

import { useState, useEffect, useCallback } from "react";
import { isContractsConfigured, fromOnChainAmount, toOnChainAmount } from "@/lib/stellar/config";
import { makeSignTransaction } from "@/lib/stellar/contracts";

export interface LendingPosition {
  debt: number;
  collateral: number;
  healthFactor: number | null; // null rendered as "∞" by the UI (no debt)
}

export interface UseLendingResult {
  position: LendingPosition | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  isReady: boolean;
  refresh: () => Promise<void>;
  borrow: (collateralAmount: number, borrowAmount: number) => Promise<boolean>;
  repay: (amount: number) => Promise<boolean>;
}

const NOT_CONFIGURED_MESSAGE =
  "Contracts aren't connected yet. Deploy the 4 Soroban contracts " +
  "(ztocks-contracts/contracts/README.md), set their IDs in .env.local, " +
  "then run scripts/generate-bindings.sh to enable live lending.";

async function getLendingClient(publicKey?: string) {
  const { Client: LendingClient, networks } = await import("lending-client").catch(() => {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  });
  const { SOROBAN_RPC_URL } = await import("@/lib/stellar/config");
  return new LendingClient({
    ...networks[process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"],
    rpcUrl: SOROBAN_RPC_URL,
    ...(publicKey
      ? { publicKey, signTransaction: makeSignTransaction(publicKey) }
      : {}),
  });
}

/**
 * Reads + writes against the lending contract (contracts/lending/
 * src/lib.rs) via the generated `lending-client` bindings package.
 * `health_factor` returns Result<i128, LendingError> (Result-wrapped);
 * `get_position` returns a plain (i128, i128) tuple (not wrapped) —
 * see contracts/lending/src/lib.rs. Both distinctions confirmed
 * against @stellar/stellar-sdk's contract/rust_result.d.ts.
 *
 * IMPORTANT: calling `borrow()` will fail on-chain with NoValidProof
 * unless `lending.submit_proof()` succeeded first in this session
 * (see useZkProof.ts) — the contract requires a fresh, passing proof
 * within proof_validity_secs before accepting any borrow.
 */
export function useLending(address: string | null): UseLendingResult {
  const [position, setPosition] = useState<LendingPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setPosition(null);
      return;
    }
    if (!isContractsConfigured()) {
      setError(NOT_CONFIGURED_MESSAGE);
      setIsReady(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const lending = await getLendingClient();

      const positionTx = await lending.get_position({ user: address });
      const [debtRaw, collateralRaw] = positionTx.result as [bigint, bigint];

      const healthTx = await lending.health_factor({ user: address });
      const healthResult = healthTx.result;
      let healthFactor: number | null = null;
      if (healthResult.isOk()) {
        const raw = healthResult.unwrap();
        healthFactor = raw === -1n ? null : fromOnChainAmount(raw);
      }

      setPosition({
        debt: fromOnChainAmount(debtRaw),
        collateral: fromOnChainAmount(collateralRaw),
        healthFactor,
      });
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lending position.");
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const borrow = useCallback(
    async (collateralAmount: number, borrowAmount: number): Promise<boolean> => {
      if (!address) {
        setError("Connect your wallet first.");
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const lending = await getLendingClient(address);
        const assembled = await lending.borrow({
          user: address,
          collateral_amount: toOnChainAmount(collateralAmount),
          borrow_amount: toOnChainAmount(borrowAmount),
        });
        const sentTx = await assembled.signAndSend();
        const result = sentTx.result;
        if (!result.isOk()) {
          const err = result.unwrapErr();
          setError(typeof err === "string" ? err : err?.message ?? "Borrow failed on-chain.");
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Borrow failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, refresh]
  );

  const repay = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!address) {
        setError("Connect your wallet first.");
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const lending = await getLendingClient(address);
        const assembled = await lending.repay({
          user: address,
          repay_amount: toOnChainAmount(amount),
        });
        const sentTx = await assembled.signAndSend();
        const result = sentTx.result;
        if (!result.isOk()) {
          const err = result.unwrapErr();
          setError(typeof err === "string" ? err : err?.message ?? "Repay failed on-chain.");
          return false;
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Repay failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, refresh]
  );

  return { position, isLoading, isSubmitting, error, isReady, refresh, borrow, repay };
}
