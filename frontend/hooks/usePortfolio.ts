"use client";

import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_ASSETS } from "@/lib/stellar/config";

export interface PortfolioData {
  freeUsdc: number;
  lockedCollateral: number;
  holdings: Record<string, number>;
  totalValue: number | null;
}

export interface UsePortfolioResult {
  data: PortfolioData | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_HOLDINGS = Object.fromEntries(SUPPORTED_ASSETS.map((a) => [a, 0]));

/**
 * 🚀 DEMO MODE: Gathers current asset quantities and cash balances directly out of 
 * local browser memory (`localStorage`). Automatically funds new demo wallets with
 * a starting balance so the user can immediately test trades and loans.
 */
export function usePortfolio(address: string | null): UsePortfolioResult {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Helper function to read local storage values safely
      const getStoredValue = (key: string): number => {
        if (typeof window === "undefined") return 0;
        return parseFloat(localStorage.getItem(`ztocks_demo_${key}`) || "-1"); // Default to -1 to detect uninitialized states
      };

      const setStoredValue = (key: string, value: number) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(`ztocks_demo_${key}`, value.toFixed(2));
        }
      };

      // 🎁 DEMO FAUCET: If this is a fresh session and USDc doesn't exist, seed it with $10,000!
      let freeUsdc = getStoredValue("USDc");
      if (freeUsdc === -1) {
        setStoredValue("USDc", 10000.00);
        freeUsdc = 10000.00;
      }

      let lockedCollateral = getStoredValue("lending_collateral");
      if (lockedCollateral === -1) {
        setStoredValue("lending_collateral", 0.00);
        lockedCollateral = 0.00;
      }

      // 2. Map all token holdings matching asset configuration list symbols
      const holdings: Record<string, number> = { ...EMPTY_HOLDINGS };
      SUPPORTED_ASSETS.forEach((symbol) => {
        let amt = getStoredValue(symbol);
        if (amt === -1) {
          setStoredValue(symbol, 0.00);
          amt = 0.00;
        }
        holdings[symbol] = amt;
      });

      // 3. Match simulated baseline valuation rates to aggregate asset holdings
      const mockPrices: Record<string, number> = {
        AAPL: 175.42, AAPLX: 175.42,
        TSLA: 182.19, TSLAX: 182.19,
        NVDA: 875.12, NVDAX: 875.12,
        GOOGL: 151.60, GOOGLX: 151.60
      };

      let assetValueSum = 0;
      SUPPORTED_ASSETS.forEach((symbol) => {
        const amount = holdings[symbol] || 0;
        const currentPrice = mockPrices[symbol] || 100.00;
        assetValueSum += amount * currentPrice;
      });

      // Total portfolio equity value computation
      const totalValue = parseFloat((freeUsdc + lockedCollateral + assetValueSum).toFixed(2));

      setData({
        freeUsdc,
        lockedCollateral,
        holdings,
        totalValue,
      });
    } catch (err) {
      setError("Failed to resolve simulated portfolio registry metrics.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Hook directly into the unified global state synchronization listener
  useEffect(() => {
    fetchPortfolio();

    if (typeof window !== "undefined") {
      window.addEventListener("ztocks_balance_update", fetchPortfolio);
      return () => window.removeEventListener("ztocks_balance_update", fetchPortfolio);
    }
  }, [fetchPortfolio]);

  return { data, isLoading, error, isReady, refresh: fetchPortfolio };
}
