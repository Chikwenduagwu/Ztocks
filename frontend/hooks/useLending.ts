"use client";

import { useState, useEffect, useCallback } from "react";

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

/**
 * 🚀 DEMO MODE: Bypasses live Soroban lending contracts and zero-knowledge proof checks.
 * Manages lending positions, debt thresholds, and health metrics directly inside
 * local browser memory (`localStorage`) for a bulletproof, zero-crash submission.
 */
export function useLending(address: string | null): UseLendingResult {
  const [position, setPosition] = useState<LendingPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(true);

  // Helper utility to read local storage values safely
  const getStoredValue = (key: string): number => {
    if (typeof window === "undefined") return 0;
    return parseFloat(localStorage.getItem(`ztocks_demo_${key}`) || "0");
  };

  const setStoredValue = (key: string, value: number) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`ztocks_demo_${key}`, value.toFixed(2));
    }
  };

  const refresh = useCallback(async () => {
    if (!address) {
      setPosition(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const debt = getStoredValue("lending_debt");
      const collateral = getStoredValue("lending_collateral");

      // Calculate a realistic simulated health factor based on collateral/debt ratio
      let healthFactor: number | null = null;
      if (debt > 0) {
        // Collateralized ratio mock calculation (e.g., target safe health > 1.0)
        healthFactor = parseFloat(((collateral * 0.8) / debt).toFixed(2));
      }

      setPosition({
        debt,
        collateral,
        healthFactor: healthFactor !== null && healthFactor < 0 ? null : healthFactor,
      });
    } catch (err) {
      setError("Failed to sync lending storage context.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Hook into the same custom event listener used by useTrade so values stay unified
  useEffect(() => {
    refresh();
    
    if (typeof window !== "undefined") {
      window.addEventListener("ztocks_balance_update", refresh);
      return () => window.removeEventListener("ztocks_balance_update", refresh);
    }
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
        // ⏱️ Small delay for UI loader polish
        await new Promise((resolve) => setTimeout(resolve, 800));

        const currentUsdc = getStoredValue("USDc");
        const currentDebt = getStoredValue("lending_debt");
        const currentCollateral = getStoredValue("lending_collateral");

        // Basic demo validation: Make sure they have the collateral they claim to provide
        if (currentUsdc < collateralAmount) {
          setError(`Insufficient USDc cash on hand to deposit as collateral.`);
          return false;
        }

        // Apply changes to simulated system state
        setStoredValue("USDc", currentUsdc - collateralAmount);
        setStoredValue("lending_collateral", currentCollateral + collateralAmount);
        setStoredValue("lending_debt", currentDebt + borrowAmount);

        // Notify app to recalculate and refresh view states
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ztocks_balance_update"));
        }
        
        return true;
      } catch (err) {
        setError("Simulated borrow action failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address]
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
        await new Promise((resolve) => setTimeout(resolve, 800));

        const currentUsdc = getStoredValue("USDc");
        const currentDebt = getStoredValue("lending_debt");
        const currentCollateral = getStoredValue("lending_collateral");

        if (currentUsdc < amount) {
          setError("Insufficient USDc cash to fulfill this repayment.");
          return false;
        }

        if (currentDebt < amount) {
          setError("Repay amount exceeds your outstanding active debt.");
          return false;
        }

        // Calculate proportions to release a matching portion of collateral for a realistic feel
        const repaymentRatio = amount / (currentDebt || 1);
        const collateralToRelease = currentCollateral * repaymentRatio;

        setStoredValue("USDc", currentUsdc - amount + collateralToRelease);
        setStoredValue("lending_collateral", currentCollateral - collateralToRelease);
        setStoredValue("lending_debt", currentDebt - amount);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("ztocks_balance_update"));
        }

        return true;
      } catch (err) {
        setError("Simulated repayment action failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address]
  );

  return { position, isLoading, isSubmitting, error, isReady, refresh, borrow, repay };
                       }
