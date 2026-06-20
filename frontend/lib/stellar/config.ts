/**
 * Central Stellar/Soroban network + contract configuration.
 * All contract IDs come from env vars set after running the deploy
 * steps in ztocks-contracts/contracts/README.md.
 */

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";

export const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015";

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const CONTRACT_IDS = {
  oracle: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID ?? "",
  vault: process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID ?? "",
  lending: process.env.NEXT_PUBLIC_LENDING_CONTRACT_ID ?? "",
  zkVerifier: process.env.NEXT_PUBLIC_ZK_VERIFIER_CONTRACT_ID ?? "",
  usdc: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ?? "",
};

/** Synthetic asset symbols supported across the app, matching the
 * on-chain Symbol values used by price-oracle/vault (see
 * contracts/README.md step 2 & 4 `supported_assets` argument). */
export const SUPPORTED_ASSETS = ["AAPLX", "TSLAX", "NVDAX", "GOOGLX"] as const;
export type AssetSymbol = (typeof SUPPORTED_ASSETS)[number];

export const ASSET_DISPLAY_NAMES: Record<AssetSymbol, string> = {
  AAPLX: "Apple Inc.",
  TSLAX: "Tesla Inc.",
  NVDAX: "Nvidia Corp.",
  GOOGLX: "Alphabet Inc.",
};

/** All on-chain amounts (USDC, holdings, prices) use this fixed-point
 * scale, matching vault/src/lib.rs and price-oracle/src/lib.rs. */
export const FIXED_POINT_SCALE = 1_000_000;

export function fromOnChainAmount(raw: bigint | number): number {
  return Number(raw) / FIXED_POINT_SCALE;
}

export function toOnChainAmount(value: number): bigint {
  return BigInt(Math.round(value * FIXED_POINT_SCALE));
}

export function isContractsConfigured(): boolean {
  return Boolean(
    CONTRACT_IDS.oracle && CONTRACT_IDS.vault && CONTRACT_IDS.lending && CONTRACT_IDS.usdc
  );
}
