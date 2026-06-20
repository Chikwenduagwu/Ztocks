"use client";

import { useState, useEffect, useCallback } from "react";
import { isContractsConfigured, fromOnChainAmount, SUPPORTED_ASSETS, AssetSymbol } from "@/lib/stellar/config";

export interface AssetPrice {
  symbol: AssetSymbol;
  price: number | null;
  updatedAt: number | null; // unix seconds
}

export interface UseAssetPricesResult {
  prices: Record<AssetSymbol, AssetPrice>;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  refresh: () => Promise<void>;
}

const NOT_CONFIGURED_MESSAGE =
  "Price oracle isn't connected yet. Deploy contracts and run " +
  "scripts/generate-bindings.sh, then start scripts/price-pusher " +
  "(see its README) to populate live prices.";

const EMPTY_PRICES: Record<AssetSymbol, AssetPrice> = Object.fromEntries(
  SUPPORTED_ASSETS.map((s) => [s, { symbol: s, price: null, updatedAt: null }])
) as Record<AssetSymbol, AssetPrice>;

/**
 * Reads each supported asset's latest price from the price-oracle
 * contract (contracts/price-oracle/src/lib.rs `get_price`), via the
 * generated `price-oracle-client` bindings package. `get_price`
 * returns Result<PriceQuote, OracleError> — Result-wrapped, per that
 * contract's Rust signature.
 *
 * Prices here only reflect whatever scripts/price-pusher last wrote
 * on-chain — if that script isn't running, prices will be stale or
 * absent (price: null), which the UI should show plainly rather than
 * inventing a number.
 */
export function useAssetPrices(): UseAssetPricesResult {
  const [prices, setPrices] = useState<Record<AssetSymbol, AssetPrice>>(EMPTY_PRICES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isContractsConfigured()) {
      setError(NOT_CONFIGURED_MESSAGE);
      setIsReady(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { Client: OracleClient, networks } = await import("price-oracle-client").catch(() => {
        throw new Error(NOT_CONFIGURED_MESSAGE);
      });
      const { SOROBAN_RPC_URL } = await import("@/lib/stellar/config");

      const oracle = new OracleClient({
        ...networks[process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"],
        rpcUrl: SOROBAN_RPC_URL,
      });

      const next: Record<AssetSymbol, AssetPrice> = { ...EMPTY_PRICES };
      await Promise.all(
        SUPPORTED_ASSETS.map(async (symbol) => {
          try {
            const tx = await oracle.get_price({ asset: symbol });
            const result = tx.result;
            if (result.isOk()) {
              const quote = result.unwrap() as { price: bigint; updated_at: bigint };
              next[symbol] = {
                symbol,
                price: fromOnChainAmount(quote.price),
                updatedAt: Number(quote.updated_at),
              };
            }
          } catch (err) {
            console.warn(`Price unavailable for ${symbol}:`, err);
          }
        })
      );

      setPrices(next);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prices.");
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 60s to match the price-pusher's default tick
    // interval (see scripts/price-pusher/.env.example PUSH_INTERVAL_SECONDS).
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { prices, isLoading, error, isReady, refresh };
}
