"use client";

import { useState, useEffect, useCallback } from "react";
import {
  connectFreighter,
  getConnectedAddress,
  isFreighterInstalled,
  FreighterNotInstalledError,
  WrongNetworkError,
} from "@/lib/stellar/wallet";

export interface UseWalletResult {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  freighterAvailable: boolean | null; // null = not checked yet
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Wallet connection state for the whole app. Restores an already-
 * authorized Freighter session on mount (getConnectedAddress), so a
 * page refresh doesn't force a re-connect if the user already
 * granted access this browser session.
 */
export function useWallet(): UseWalletResult {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freighterAvailable, setFreighterAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isFreighterInstalled();
      if (cancelled) return;
      setFreighterAvailable(available);
      if (available) {
        const existing = await getConnectedAddress();
        if (!cancelled && existing) setAddress(existing);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { address: addr } = await connectFreighter();
      setAddress(addr);
    } catch (err) {
      if (err instanceof FreighterNotInstalledError) {
        setError("Freighter wallet not found. Install it from freighter.app to continue.");
      } else if (err instanceof WrongNetworkError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Freighter has no programmatic "disconnect" — apps just clear
    // their own local notion of the connected address. The user can
    // revoke access from the extension's site-permissions UI directly.
    setAddress(null);
  }, []);

  return { address, isConnecting, error, freighterAvailable, connect, disconnect };
}
