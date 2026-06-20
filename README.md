# Ztocks — Private Tokenized Stock Investing on Stellar

**Stellar Hacks: Real-World ZK Hackathon submission.** Buy synthetic
tokenized stocks (AAPLx, TSLAx, NVDAx, GOOGLx) on Stellar while
proving portfolio solvency via Groth16 zero-knowledge proofs, verified
on-chain in Soroban — without ever revealing individual holdings.

```
.
├── contracts/   Soroban contracts (vault, lending, price-oracle,
│                zk-verifier) + the Circom ZK circuit. See
│                contracts/contracts/README.md for full deploy steps.
├── frontend/    The Next.js app. See frontend/SETUP.md for the
│                detailed local-dev setup, and DEPLOY.md (this
│                directory) for Vercel.
└── DEPLOY.md    How to deploy frontend/ to Vercel from this monorepo.
```

## Quick start (local)

```bash
# 1. Deploy contracts + build the ZK circuit (needs Rust, circom, snarkjs)
cd contracts/contracts && cat README.md   # follow this fully first

# 2. Generate typed bindings + run the frontend
cd ../../frontend
cp .env.example .env.local   # fill in contract IDs from step 1
./scripts/generate-bindings.sh
npm install
npm run dev
```

The frontend **builds and runs without step 1** — every page shows a
clear "Setup needed" banner instead of fake numbers until contracts
are deployed and bound. See `frontend/SETUP.md` for the complete
walkthrough including the price-pusher and ZK proof-encoder pieces.

## Deploying to Vercel

See `DEPLOY.md` — short version: set **Root Directory** to `frontend`
in the Vercel dashboard project settings, don't override build
commands, deploy. `.vercelignore` already keeps `contracts/` and the
price-pusher script out of the build.

**Important**: Vercel can build and host the frontend, but it cannot
run the always-on price-pusher script (Vercel functions are
serverless/short-lived, not long-running processes) or compile/deploy
the Rust contracts. Those two pieces need a separate host — a small
VM, a Railway/Render worker, or a cron-triggered job for the pusher;
your own machine or CI for the one-time contract deploy. The deployed
frontend will work and look correct either way, but will show "Setup
needed" banners until those pieces are live somewhere and their
addresses/URLs are set as Vercel environment variables.

## What's real vs. illustrative

Every page under `/trade`, `/portfolio`, `/lending` reads and writes
live on-chain state once contracts are deployed and bound — no mock
arrays remain in those flows. Two landing-page sections
(`PortfolioPreview`, `LendingSection`) show clearly-labeled **"Sample
Data"** for visitors without a connected wallet; both link through to
the real, live pages. The "How It Works" page is static educational
content, not financial data.

## Tech stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS, Framer Motion
- **Wallet**: Freighter
- **Chain**: Stellar Soroban
- **ZK**: Circom (BLS12-381) + snarkjs (browser proving) + Groth16 verifier in Rust
- **Oracle**: Custom pushed-price oracle (Finnhub/Twelve Data → Soroban)
