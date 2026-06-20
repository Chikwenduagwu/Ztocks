"use client";

/**
 * HIGH-RISK FILE — READ THIS BEFORE RELYING ON IT
 * -----------------------------------------------------------------
 * This hook runs snarkjs.groth16.fullProve() in the browser (real,
 * confirmed API: https://github.com/iden3/snarkjs — takes a private
 * input object + paths to the circuit's .wasm and .zkey, returns
 * { proof, publicSignals } as decimal-string coordinates).
 *
 * The unresolved problem is the LAST MILE: converting those decimal
 * coordinates into the exact byte layout Soroban's G1Affine::from_array
 * / G2Affine::from_array expect. I found a documented, open
 * inconsistency between ark-serialize's BLS12-381 point encoding and
 * other common implementations (zkcrypto/pairing, Go's bls12-381) —
 * see arkworks-rs/algebra issues #257 and arkworks-rs/curves #14 — and
 * I have no Rust toolchain or browser available in my build sandbox to
 * round-trip-test a hand-written JS encoder against the real contract.
 * Shipping an unverified byte-packing function here would be the
 * single highest-risk guess in this entire codebase: silently wrong
 * bytes would make every proof fail to verify with no clear error.
 *
 * SAFE PATH (do this before relying on submitProof in production):
 *   1. Keep proof generation here in JS (fullProve is well-trodden
 *      and low-risk — it's pure snarkjs, no custom encoding).
 *   2. Move the decimal-string -> G1Affine/G2Affine BYTE CONVERSION
 *      to a tiny serverless function or local script that uses the
 *      SAME ark-bls12-381 + ark-serialize Rust crates already used by
 *      contracts/zk-verifier/src/bin/gen_vkey.rs (see that file for
 *      the exact, verified pattern: Fq::from_str -> G1Affine::new ->
 *      serialize_uncompressed). That guarantees byte-for-byte
 *      consistency with what the deployed contract expects, because
 *      it's the literal same code path, not a from-scratch JS
 *      reimplementation.
 *   3. This hook calls that conversion endpoint/script with the raw
 *      proof.json, gets back ready-to-submit bytes, and only then
 *      calls lending.submit_proof().
 *
 * The placeholder `decimalCoordsToG1Bytes`/`decimalCoordsToG2Bytes`
 * below are intentionally left UNIMPLEMENTED (they throw) rather than
 * filled with an unverified guess — wire them to the safe path above,
 * or replace them once you've round-trip-tested an encoding against
 * your actual deployed zk-verifier contract on testnet.
 */

import { useState, useCallback } from "react";
import { toOnChainAmount } from "@/lib/stellar/config";
import { makeSignTransaction } from "@/lib/stellar/contracts";

const NOT_CONFIGURED_MESSAGE =
  "Contracts aren't connected yet. Deploy the 4 Soroban contracts " +
  "(ztocks-contracts/contracts/README.md), set their IDs in .env.local, " +
  "then run scripts/generate-bindings.sh to enable proof submission.";

async function getLendingClient(publicKey: string) {
  const { Client: LendingClient, networks } = await import("lending-client").catch(() => {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  });
  const { SOROBAN_RPC_URL } = await import("@/lib/stellar/config");
  return new LendingClient({
    ...networks[process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"],
    rpcUrl: SOROBAN_RPC_URL,
    publicKey,
    signTransaction: makeSignTransaction(publicKey),
  });
}

export interface PortfolioWitness {
  holdings: number[]; // 4 values, AAPLx/TSLAx/NVDAx/GOOGLx units
  prices: number[]; // 4 values, USD per unit at proof time
  salt: bigint;
  ownerAddressAsInt: bigint; // see circuits/portfolio_threshold.circom
}

export interface UseZkProofResult {
  isProving: boolean;
  isSubmitting: boolean;
  error: string | null;
  proofVerified: boolean | null;
  generateAndSubmitProof: (
    witness: PortfolioWitness,
    threshold: number,
    minAssets: number
  ) => Promise<boolean>;
}

/**
 * Calls a local conversion endpoint that wraps
 * `cargo run --bin encode_proof` (see ztocks-contracts/contracts/
 * zk-verifier/src/bin/encode_proof.rs) — this is the "safe path"
 * described in the module doc comment above: the actual BLS12-381
 * byte encoding happens in Rust, using the exact same ark-bls12-381
 * call path the deployed contract was built with, so there is no
 * separate JS encoding to get subtly wrong.
 *
 * You need to stand up this endpoint yourself (a few lines: a small
 * Express/Next API route that writes proof/public JSON to a temp
 * file, shells out to `cargo run --bin encode_proof`, and returns its
 * stdout). It is intentionally NOT included as a fake/mocked
 * implementation here — see the module doc comment for why faking
 * this would be worse than leaving it unimplemented.
 */
async function encodeProofViaBackend(
  proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] },
  publicSignals: string[]
): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
  const endpoint = process.env.NEXT_PUBLIC_PROOF_ENCODER_URL;
  if (!endpoint) {
    throw new Error(
      "NEXT_PUBLIC_PROOF_ENCODER_URL is not set. This hook requires a small " +
        "backend endpoint wrapping `cargo run --bin encode_proof` (see " +
        "ztocks-contracts/contracts/zk-verifier/src/bin/encode_proof.rs and " +
        "the module doc comment at the top of this file) — proof submission " +
        "is disabled until that's wired up, rather than silently using an " +
        "unverified JS-side byte encoding."
    );
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proof, publicSignals }),
  });
  if (!res.ok) {
    throw new Error(`Proof encoder endpoint returned ${res.status}`);
  }
  const { a, b, c } = (await res.json()) as { a: string; b: string; c: string };
  const hexToBytes = (hex: string) =>
    new Uint8Array(hex.replace(/^0x/, "").match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return { a: hexToBytes(a), b: hexToBytes(b), c: hexToBytes(c) };
}

/** Builds the circuit's witness input object — see
 * circuits/input.example.json for the exact field shapes this must
 * match (all monetary values 1e6-scaled integers as strings/bigints,
 * matching what circom's witness calculator expects). */
function buildCircuitInput(witness: PortfolioWitness, threshold: number, minAssets: number) {
  return {
    holdings: witness.holdings.map((h) => toOnChainAmount(h).toString()),
    prices: witness.prices.map((p) => toOnChainAmount(p).toString()),
    salt: witness.salt.toString(),
    ownerAddress: witness.ownerAddressAsInt.toString(),
    threshold: toOnChainAmount(threshold).toString(),
    minAssets: minAssets.toString(),
    // ownerCommit must be precomputed as SHA256(ownerAddress || salt)'s
    // low 253 bits — see circuits/portfolio_threshold.circom comment
    // block. This needs the same bit-decomposition the circuit does;
    // computing it correctly client-side (matching circom's Num2Bits/
    // Sha256/Bits2Num bit ordering exactly) is itself non-trivial and
    // should be implemented and tested alongside the byte-encoding
    // work flagged above, not guessed at here.
    ownerCommit: "0", // PLACEHOLDER — see comment above.
  };
}

export function useZkProof(address: string | null): UseZkProofResult {
  const [isProving, setIsProving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofVerified, setProofVerified] = useState<boolean | null>(null);

  const generateAndSubmitProof = useCallback(
    async (
      witness: PortfolioWitness,
      threshold: number,
      minAssets: number
    ): Promise<boolean> => {
      if (!address) {
        setError("Connect your wallet first.");
        return false;
      }

      setIsProving(true);
      setError(null);
      setProofVerified(null);

      try {
        const snarkjs = await import("snarkjs");

        const input = buildCircuitInput(witness, threshold, minAssets);

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          input,
          "/zk/portfolio_threshold.wasm",
          "/zk/portfolio_threshold_final.zkey"
        );

        setIsProving(false);
        setIsSubmitting(true);

        const { a, b, c } = await encodeProofViaBackend(proof, publicSignals);

        const lending = await getLendingClient(address);
        const assembled = await lending.submit_proof({
          user: address,
          proof: { a, b, c },
          threshold: BigInt(publicSignals[0]),
          min_assets: BigInt(publicSignals[1]),
          owner_commit: BigInt(publicSignals[2]),
        });
        const sentTx = await assembled.signAndSend();
        const result = sentTx.result;

        if (!result.isOk()) {
          const err = result.unwrapErr();
          setError(typeof err === "string" ? err : err.message ?? "Proof rejected on-chain.");
          setProofVerified(false);
          return false;
        }

        setProofVerified(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Proof generation/submission failed.");
        setProofVerified(false);
        return false;
      } finally {
        setIsProving(false);
        setIsSubmitting(false);
      }
    },
    [address]
  );

  return { isProving, isSubmitting, error, proofVerified, generateAndSubmitProof };
}
