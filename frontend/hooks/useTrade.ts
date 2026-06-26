"use client";

import { useState, useCallback } from "react";

export interface UseTradeResult {
  isSubmitting: boolean;
  error: string | null;
  txHash: string | null;
  buy: (asset: string, amount: number) => Promise<boolean>;
  sell: (asset: string, amount: number) => Promise<boolean>;
  deposit: (amount: number) => Promise<boolean>;
  withdraw: (amount: number) => Promise<boolean>;
}

/**
 * 🚀 DEMO MODE: Bypasses live Soroban RPC endpoints and heavy cryptographic signers.
 * Instantly updates local UI view states with simulated transaction logs to ensure
 * flawless presentations without blockchain lag or network configuration failures.
 */
export function useTrade(address: string | null): UseTradeResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const runWriteSimulated = useCallback(
    async (methodName: "buy" | "sell" | "deposit" | "withdraw"): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      setTxHash(null);

      try {
        // ⏱️ Brief mock artificial delay to simulate network roundtrips beautifully
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 🎰 Generate a realistic mock Stellar transaction hash 
        const randomHash = Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("").toUpperCase();

        setTxHash(randomHash);
        return true;
      } catch (err) {
        setError("Simulated interaction failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const buy = useCallback(
    (asset: string, amount: number) => runWriteSimulated("buy"),
    [runWriteSimulated]
  );

  const sell = useCallback(
    (asset: string, amount: number) => runWriteSimulated("sell"),
    [runWriteSimulated]
  );

  const deposit = useCallback(
    (amount: number) => runWriteSimulated("deposit"),
    [runWriteSimulated]
  );

  const withdraw = useCallback(
    (amount: number) => runWriteSimulated("withdraw"),
    [runWriteSimulated]
  );

  return { isSubmitting, error, txHash, buy, sell, deposit, withdraw };
}
