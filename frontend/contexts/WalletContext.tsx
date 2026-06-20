"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWallet, UseWalletResult } from "@/hooks/useWallet";

const WalletContext = createContext<UseWalletResult | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

/** Single source of truth for the connected Freighter address across
 * every page — avoids each page independently re-checking/re-
 * connecting Freighter and getting out of sync with each other. */
export function useWalletContext(): UseWalletResult {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return ctx;
}
