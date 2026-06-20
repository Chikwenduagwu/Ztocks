"use client";

import { useState, useEffect, useCallback } from "react";
import { isContractsConfigured, fromOnChainAmount, SUPPORTED_ASSETS } from "@/lib/stellar/config";

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
  /** True once contracts are deployed AND bindings generated (see
   * scripts/generate-bindings.sh) — the UI uses this to show a setup
   * banner instead of silently rendering zeros. */
  isReady: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_HOLDINGS = Object.fromEntries(SUPPORTED_ASSETS.map((a) => [a, 0]));

const NOT_CONFIGURED_MESSAGE =
  "Contracts aren't connected yet. Deploy the 4 Soroban contracts " +
  "(ztocks-contracts/contracts/README.md), set their IDs in .env.local, " +
  "then run scripts/generate-bindings.sh to enable live data.";

/**
 * Reads live portfolio state from the vault contract for the
 * connected wallet, using the generated `vault-client` package (see
 * scripts/generate-bindings.sh). That package only exists after you
 * deploy the vault contract and generate its bindings — until then,
 * this hook reports `isReady: false` and a clear setup message
 * rather than fabricating numbers, since silently showing $0.00
 * everywhere is indistinguishable from "this dApp is broken" and
 * showing demo numbers risks being mistaken for real on-chain state.
 *
 * Once bindings exist, replace the dynamic import below with a
 * static one:
 *   import { Client as VaultClient, networks } from "vault-client";
 */
export function usePortfolio(address: string | null): UsePortfolioResult {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setData(null);
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
      // Dynamic import: this package (./packages/vault, aliased as
      // "vault-client" in package.json per generate-bindings.sh's
      // printed instructions) does not exist until you've deployed
      // the vault contract and run that script. A dynamic import lets
      // the rest of the app build and run cleanly before that point,
      // instead of a hard compile-time failure on a missing module.
      const { Client: VaultClient, networks } = await import(
        /* webpackIgnore: false */ "vault-client"
      ).catch(() => {
        throw new Error(NOT_CONFIGURED_MESSAGE);
      });

      const { SOROBAN_RPC_URL } = await import("@/lib/stellar/config");
      const vault = new VaultClient({
        ...networks[process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"],
        rpcUrl: SOROBAN_RPC_URL,
      });

      // get_portfolio(user) -> (i128, i128, Map<Symbol, i128>) per
      // contracts/vault/src/lib.rs — plain tuple, not Result-wrapped,
      // so .result is the tuple directly (read-only call, simulation
      // only, no signature needed).
      const portfolioTx = await vault.get_portfolio({ user: address });
      const [freeRaw, lockedRaw, holdingsMap] = portfolioTx.result as [
        bigint,
        bigint,
        Map<string, bigint>
      ];

      const holdings: Record<string, number> = { ...EMPTY_HOLDINGS };
      for (const [symbol, amount] of holdingsMap.entries()) {
        holdings[symbol] = fromOnChainAmount(amount);
      }

      let totalValue: number | null = null;
      try {
        const valueTx = await vault.portfolio_value({ user: address });
        // portfolio_value's Rust signature is Result<i128, VaultError>
        // — Result-wrapped, unlike get_portfolio above. Confirmed
        // against @stellar/stellar-sdk's contract/rust_result.d.ts.
        const valueResult = valueTx.result;
        if (valueResult.isOk()) {
          totalValue = fromOnChainAmount(valueResult.unwrap());
        }
      } catch (valueErr) {
        console.warn("portfolio_value unavailable (oracle prices may be unset yet):", valueErr);
      }

      setData({
        freeUsdc: fromOnChainAmount(freeRaw),
        lockedCollateral: fromOnChainAmount(lockedRaw),
        holdings,
        totalValue,
      });
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio.");
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return { data, isLoading, error, isReady, refresh: fetchPortfolio };
}
