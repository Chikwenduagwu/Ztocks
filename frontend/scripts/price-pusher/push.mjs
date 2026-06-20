#!/usr/bin/env node
/**
 * Ztocks Price Pusher
 * -----------------------------------------------------------------
 * Reads real AAPL/TSLA/NVDA/GOOGL quotes from a stock-data API
 * (Finnhub or Twelve Data — set STOCK_API_PROVIDER) and pushes them
 * on-chain to the price-oracle Soroban contract's push_prices()
 * method, signed by the dedicated PUSHER_SECRET_KEY.
 *
 * This is the off-chain half of the oracle pattern documented in
 * contracts/price-oracle/src/lib.rs — Stellar has no native feed for
 * individual US equities, so something has to bridge real prices
 * on-chain. This script is that bridge.
 *
 * Usage:
 *   cp .env.example .env   # fill in your values
 *   npm install
 *   npm run once     # push prices a single time (good for testing)
 *   npm start         # run continuously on PUSH_INTERVAL_SECONDS
 *
 * Real, verified Stellar SDK call pattern used below (Operation.
 * invokeContractFunction / nativeToScVal / prepareTransaction /
 * sendTransaction / pollTransaction) — confirmed against Stellar's
 * own developer docs at developers.stellar.org/docs/build/guides/
 * transactions/{signing-soroban-invocations,submit-transaction-wait-js}.
 */

import "dotenv/config";
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  nativeToScVal,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { fetchQuotes } from "./providers.mjs";

const {
  STELLAR_NETWORK = "testnet",
  SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org",
  ORACLE_CONTRACT_ID,
  PUSHER_SECRET_KEY,
  PUSH_INTERVAL_SECONDS = "60",
  ASSETS = "AAPLX:AAPL,TSLAX:TSLA,NVDAX:NVDA,GOOGLX:GOOGL",
} = process.env;

const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

function assertConfigured() {
  const missing = [];
  if (!ORACLE_CONTRACT_ID) missing.push("ORACLE_CONTRACT_ID");
  if (!PUSHER_SECRET_KEY) missing.push("PUSHER_SECRET_KEY");
  if (missing.length) {
    console.error(
      `Missing required .env values: ${missing.join(", ")}\n` +
        `Copy .env.example to .env and fill these in before running.`
    );
    process.exit(1);
  }
}

/** Parses "AAPLX:AAPL,TSLAX:TSLA" into [{onchain: "AAPLX", ticker: "AAPL"}, ...] */
function parseAssetMap(s) {
  return s.split(",").map((pair) => {
    const [onchain, ticker] = pair.split(":");
    return { onchain: onchain.trim(), ticker: ticker.trim() };
  });
}

/** Scales a float USD price to the 1e6 fixed-point integer the
 * contracts use throughout (see vault/src/lib.rs comments). */
function toScaledInt(price) {
  return BigInt(Math.round(price * 1_000_000));
}

async function pushOnce() {
  assertConfigured();
  const assetMap = parseAssetMap(ASSETS);
  const server = new Server(SOROBAN_RPC_URL);
  const pusherKeypair = Keypair.fromSecret(PUSHER_SECRET_KEY);

  console.log(`[${new Date().toISOString()}] Fetching quotes for: ${assetMap.map((a) => a.ticker).join(", ")}`);
  const quotes = await fetchQuotes(assetMap.map((a) => a.ticker));

  const assetSymbols = [];
  const priceValues = [];
  for (const { onchain, ticker } of assetMap) {
    const price = quotes[ticker];
    if (price == null) {
      console.warn(`  ! No quote returned for ${ticker}, skipping`);
      continue;
    }
    const scaled = toScaledInt(price);
    console.log(`  ${ticker} -> ${onchain}: $${price.toFixed(2)} (on-chain: ${scaled})`);
    assetSymbols.push(onchain);
    priceValues.push(scaled);
  }

  if (assetSymbols.length === 0) {
    console.warn("No valid quotes to push this tick — skipping on-chain call.");
    return;
  }

  const sourceAccount = await server.getAccount(pusherKeypair.publicKey());

  // VERIFIED in this sandbox against the real installed SDK (node -e
  // smoke test): for a homogeneous Vec, nativeToScVal wants a
  // *singular* type string (`{ type: 'symbol' }`), not an array —
  // `{ type: ['symbol'] }` throws "invalid type specified". The
  // bracketed-array form in the SDK's own docs example
  // (`{ type: ['i128', 'symbol'] }`) is for heterogeneous tuple-like
  // vecs with one type per position, which doesn't apply here.
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: ORACLE_CONTRACT_ID,
        function: "push_prices",
        args: [
          // Vec<Symbol> — verified: singular 'symbol' type string
          // broadcasts across all array elements.
          nativeToScVal(assetSymbols, { type: "symbol" }),
          // Vec<i128>
          nativeToScVal(priceValues, { type: "i128" }),
        ],
      })
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(transaction);
  prepared.sign(pusherKeypair);

  const sendResponse = await server.sendTransaction(prepared);
  if (sendResponse.status !== "PENDING") {
    console.error("Transaction submission failed immediately:", sendResponse);
    return;
  }

  const finalStatus = await server.pollTransaction(sendResponse.hash, {
    attempts: 10,
    sleepStrategy: () => 1000,
  });

  if (finalStatus.status === "SUCCESS") {
    console.log(`  ✓ Pushed on-chain. Tx hash: ${sendResponse.hash}`);
  } else {
    console.error(`  ✗ Transaction did not succeed: ${finalStatus.status}`, finalStatus);
  }
}

async function main() {
  const runOnce = process.argv.includes("--once");

  if (runOnce) {
    await pushOnce();
    return;
  }

  console.log(`Starting Ztocks price pusher — interval: ${PUSH_INTERVAL_SECONDS}s`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pushOnce();
    } catch (err) {
      console.error("Push cycle failed:", err);
    }
    await new Promise((r) => setTimeout(r, Number(PUSH_INTERVAL_SECONDS) * 1000));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
