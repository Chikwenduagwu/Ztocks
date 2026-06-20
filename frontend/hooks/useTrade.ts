"use client";

import { useState, useCallback } from "react";
import { isContractsConfigured, toOnChainAmount } from "@/lib/stellar/config";
import { makeSignTransaction } from "@/lib/stellar/contracts";

export interface UseTradeResult {
  isSubmitting: boolean;
  error: string | null;
  txHash: string | null;
  buy: (asset: string, amount: number) => Promise<boolean>;
  sell: (asset: string, amount: number) => Promise<boolean>;
  deposit: (amount: number) => Promise<boolean>;
  withdraw: (amount: number) => Promise<boolean>;
}

const NOT_CONFIGURED_MESSAGE =
  "Contracts aren't connected yet. Deploy the 4 Soroban contracts " +
  "(ztocks-contracts/contracts/README.md), set their IDs in .env.local, " +
  "then run scripts/generate-bindings.sh to enable live trading.";

/**
 * Write-path hook for vault::buy / sell / deposit / withdraw, using
 * the generated `vault-client` bindings package (see
 * scripts/generate-bindings.sh and types/contract-bindings.d.ts for
 * why this is a dynamic import with an ambient type fallback rather
 * than a static one). All four contract methods return
 * `Result<(), VaultError>` in Rust (see contracts/vault/src/lib.rs),
 * so each call here unwraps `.result` as a Result<void, VaultError>
 * — confirmed against @stellar/stellar-sdk's contract/
 * rust_result.d.ts, which documents the .isOk()/.unwrap() shape for
 * any Result-typed contract method.
 */
export function useTrade(address: string | null): UseTradeResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const runWrite = useCallback(
    async (
      methodName: "buy" | "sell" | "deposit" | "withdraw",
      args: Record<string, unknown>
    ): Promise<boolean> => {
      if (!address) {
        setError("Connect your wallet first.");
        return false;
      }
      if (!isContractsConfigured()) {
        setError(NOT_CONFIGURED_MESSAGE);
        return false;
      }

      setIsSubmitting(true);
      setError(null);
      setTxHash(null);
      try {
        const { Client: VaultClient, networks } = await import("vault-client").catch(() => {
          throw new Error(NOT_CONFIGURED_MESSAGE);
        });
        const { SOROBAN_RPC_URL } = await import("@/lib/stellar/config");

        const vault = new VaultClient({
          ...networks[process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"],
          rpcUrl: SOROBAN_RPC_URL,
          publicKey: address,
          signTransaction: makeSignTransaction(address),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assembled = await (vault as any)[methodName](args);
        const sentTx = await assembled.signAndSend();

        const result = sentTx.result;
        if (!result.isOk()) {
          const err = result.unwrapErr();
          setError(typeof err === "string" ? err : err?.message ?? "Transaction failed on-chain.");
          return false;
        }

        setTxHash(sentTx.sendTransactionResponse?.hash ?? null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address]
  );

  const buy = useCallback(
    (asset: string, amount: number) =>
      runWrite("buy", { user: address, asset, amount: toOnChainAmount(amount) }),
    [address, runWrite]
  );

  const sell = useCallback(
    (asset: string, amount: number) =>
      runWrite("sell", { user: address, asset, amount: toOnChainAmount(amount) }),
    [address, runWrite]
  );

  const deposit = useCallback(
    (amount: number) => runWrite("deposit", { user: address, amount: toOnChainAmount(amount) }),
    [address, runWrite]
  );

  const withdraw = useCallback(
    (amount: number) => runWrite("withdraw", { user: address, amount: toOnChainAmount(amount) }),
    [address, runWrite]
  );

  return { isSubmitting, error, txHash, buy, sell, deposit, withdraw };
}
