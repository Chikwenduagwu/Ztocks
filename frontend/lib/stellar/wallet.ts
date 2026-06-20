"use client";

/**
 * Thin wrapper over @stellar/freighter-api, confirmed against the
 * real installed package's exports (isConnected, requestAccess,
 * getAddress, getNetworkDetails, signTransaction — verified via a
 * direct Node import check; see project notes). Freighter is a
 * browser extension, so every function here must only run client-side.
 */

import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./config";

export interface WalletConnection {
  address: string;
}

export class FreighterNotInstalledError extends Error {
  constructor() {
    super("Freighter wallet extension is not installed.");
    this.name = "FreighterNotInstalledError";
  }
}

export class WrongNetworkError extends Error {
  constructor(expected: string, actual: string) {
    super(`Wrong network: app expects "${expected}" but Freighter is on "${actual}".`);
    this.name = "WrongNetworkError";
  }
}

export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await freighterIsConnected();
    // isConnected() resolves even when not authorized, as long as the
    // extension exists; result.error is set if the extension itself
    // is missing (e.g. running in a browser without it installed).
    return !result.error;
  } catch {
    return false;
  }
}

/** Prompts the Freighter popup for account access. Throws
 * FreighterNotInstalledError or WrongNetworkError on failure;
 * callers should catch and show an appropriate UI state (this is
 * also why ConnectWalletModal's "wallet" step lists Freighter as one
 * option among several — not every visitor will have it). */
export async function connectFreighter(): Promise<WalletConnection> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new FreighterNotInstalledError();
  }

  const accessResult = await requestAccess();
  if (accessResult.error) {
    throw new Error(`Freighter access denied: ${accessResult.error}`);
  }

  const networkResult = await getNetworkDetails();
  if (networkResult.error) {
    throw new Error(`Could not read Freighter network: ${networkResult.error}`);
  }
  if (networkResult.networkPassphrase !== NETWORK_PASSPHRASE) {
    throw new WrongNetworkError(NETWORK_PASSPHRASE, networkResult.networkPassphrase);
  }

  return { address: accessResult.address };
}

export async function getConnectedAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

/** Signs a transaction XDR with Freighter, for use as the `signTransaction`
 * callback handed to @stellar/stellar-sdk/contract's basicNodeSigner-style
 * flow (see lib/stellar/contracts.ts). */
export async function signWithFreighter(
  xdr: string,
  address: string
): Promise<string> {
  const result = await freighterSignTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (result.error) {
    throw new Error(`Freighter signing failed: ${result.error}`);
  }
  return result.signedTxXdr;
}
