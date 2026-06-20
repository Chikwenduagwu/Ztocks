"use client";

/**
 * Soroban contract client helpers.
 * -----------------------------------------------------------------
 * IMPORTANT ARCHITECTURE NOTE: the generic `contract.Client` class
 * from @stellar/stellar-sdk has NO statically-typed per-contract
 * methods (confirmed directly — TypeScript correctly errors on
 * `client.get_portfolio(...)` against the bare `Client` type, since
 * Client.from() only knows a contract's shape at runtime, after
 * fetching its on-chain spec). The real, documented pattern is to
 * generate a dedicated typed NPM package per contract via:
 *
 *   stellar contract bindings typescript \
 *     --network testnet --contract-id <ID> --output-dir packages/<name>
 *
 * (see scripts/generate-bindings.sh, which does this for all 4
 * contracts at once, and developers.stellar.org/docs/build/apps/
 * guestbook/bindings for the canonical walkthrough).
 *
 * Each generated package exports its own `Client` class and a
 * `networks` map. After running scripts/generate-bindings.sh and
 * adding the packages as local file: dependencies (see that script's
 * printed instructions), import them like:
 *
 *   import { Client as VaultClient, networks } from "vault-client";
 *   const vault = new VaultClient({
 *     ...networks.testnet,
 *     rpcUrl: SOROBAN_RPC_URL,
 *     publicKey,
 *     signTransaction: makeSignTransaction(publicKey),
 *   });
 *
 * Until those packages are generated (they depend on contracts
 * actually being deployed first), this file exports the shared
 * `makeSignTransaction` adapter so every contract-specific hook can
 * use one verified, consistent signing callback — see hooks/use*.ts
 * for where the generated clients get constructed once available.
 */

import { signWithFreighter } from "./wallet";

/**
 * Adapts our Freighter wrapper to the SDK's documented `SignTransaction`
 * shape (confirmed directly against @stellar/stellar-sdk's real type
 * defs: `(xdr, opts?) => Promise<{signedTxXdr, signerAddress?, error?}>`,
 * with the doc comment explicitly noting it "matches signature of
 * signTransaction from Freighter"). This same factory is used by every
 * generated contract client below, so signing behaves identically
 * everywhere.
 */
export function makeSignTransaction(fallbackPublicKey: string) {
  return async (xdr: string, opts?: { address?: string }) => {
    const address = opts?.address ?? fallbackPublicKey;
    const signedTxXdr = await signWithFreighter(xdr, address);
    return { signedTxXdr, signerAddress: address };
  };
}
