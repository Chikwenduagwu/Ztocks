# Ztocks Soroban Contracts

Four contracts, deployed in this exact order (each later contract imports the
previous one's compiled WASM at build time via `soroban_sdk::contractimport!`,
so build order is not optional):

```
1. price-oracle   (no dependencies)
2. zk-verifier    (no dependencies — depends only on circuits/build/verification_key.json)
3. vault          (imports price-oracle's WASM)
4. lending        (imports vault's WASM + zk-verifier's WASM)
```

---

## 0. Prerequisites

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli
curl -L https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64 \
  -o /usr/local/bin/circom && chmod +x /usr/local/bin/circom
npm install -g snarkjs
```

---

## 1. Build the ZK circuit (must happen before zk-verifier compiles meaningfully)

```bash
cd ztocks-contracts
./scripts/build_circuit.sh
```

This compiles `circuits/portfolio_threshold.circom` for the **BLS12-381**
curve (not circom's bn128 default — required because Soroban's pairing host
functions only support BLS12-381), runs a local Powers-of-Tau + Groth16
trusted setup, and writes `contracts/zk-verifier/src/vkey.rs` with the real
verifying key.

⚠️ The single-contributor trusted setup this script runs is fine for a
hackathon/testnet demo. A production deployment needs a real multi-party
ceremony — do not reuse this script's `.ptau`/`.zkey` files for anything
holding real value.

---

## 2. Build & deploy price-oracle

```bash
cd contracts/price-oracle
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/price_oracle.wasm \
  --source <ADMIN_SECRET> --network testnet

# Note the returned contract ID as $ORACLE_ID, then:
stellar contract invoke --id $ORACLE_ID --source <ADMIN_SECRET> --network testnet \
  -- initialize \
  --admin <ADMIN_PUBLIC> \
  --pusher <PUSHER_PUBLIC> \
  --supported_assets '["AAPLX","TSLAX","NVDAX","GOOGLX"]'
```

`<PUSHER_PUBLIC>` is the Stellar account whose key the off-chain
`price-pusher` script (in the frontend repo, see its README) holds and signs
`push_price` calls with. Keep this key separate from `<ADMIN_SECRET>`.

---

## 3. Build & deploy zk-verifier

```bash
cd ../zk-verifier
cargo build  # sanity check vkey.rs compiles
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/zk_verifier.wasm \
  --source <ADMIN_SECRET> --network testnet
# Note the returned contract ID as $VERIFIER_ID
```

No `initialize` call needed — the verifying key is compiled in, not stored.

---

## 4. Build & deploy vault

```bash
cd ../vault
stellar contract build   # requires price-oracle's .wasm to already exist on disk
stellar contract deploy \
  --wasm target/wasm32v1-none/release/vault.wasm \
  --source <ADMIN_SECRET> --network testnet
# Note the returned contract ID as $VAULT_ID

stellar contract invoke --id $VAULT_ID --source <ADMIN_SECRET> --network testnet \
  -- initialize \
  --admin <ADMIN_PUBLIC> \
  --usdc_token <USDC_SAC_CONTRACT_ID> \
  --oracle_contract $ORACLE_ID \
  --supported_assets '["AAPLX","TSLAX","NVDAX","GOOGLX"]'
```

`<USDC_SAC_CONTRACT_ID>` is the Stellar Asset Contract ID for testnet USDC.
Find it via `stellar contract id asset --asset USDC:<ISSUER> --network testnet`,
or use Circle's official testnet USDC issuer if targeting testnet specifically.

---

## 5. Build & deploy lending

```bash
cd ../lending
stellar contract build   # requires vault's AND zk-verifier's .wasm to exist
stellar contract deploy \
  --wasm target/wasm32v1-none/release/lending.wasm \
  --source <ADMIN_SECRET> --network testnet
# Note the returned contract ID as $LENDING_ID

stellar contract invoke --id $LENDING_ID --source <ADMIN_SECRET> --network testnet \
  -- initialize \
  --admin <ADMIN_PUBLIC> \
  --vault_contract $VAULT_ID \
  --zk_verifier_contract $VERIFIER_ID \
  --borrow_apy_bps 425 \
  --liquidation_ltv_bps 8500 \
  --proof_validity_secs 3600
```

### Funding the lending pool

The lending contract disburses borrowed USDC from its own balance — it is
not minted on demand. Before any real `borrow()` call will succeed, send it
liquidity:

```bash
stellar contract invoke --id <USDC_SAC_CONTRACT_ID> --source <LP_SECRET> --network testnet \
  -- transfer --from <LP_PUBLIC> --to $LENDING_ID --amount 100000000000
```

(100,000,000,000 = 100,000 USDC at the 1e6 fixed-point scale used throughout.)

---

## Running tests

```bash
# price-oracle and vault tests run standalone:
cd contracts/price-oracle && cargo test
cd ../vault && cargo test   # needs price-oracle's .wasm built first

# zk-verifier tests use a REAL ceremony-derived fixture (the same one
# in Stellar's own groth16_verifier example) — no circuit build needed:
cd ../zk-verifier && cargo test

# lending tests need vault's + zk-verifier's .wasm built first, and
# only exercise paths that don't require a passing ZK proof (see
# src/test.rs module doc for why):
cd ../lending && cargo test
```

---

## Trust model — read before treating this as production-ready

- **Price oracle**: a single off-chain "pusher" key writes prices. This is
  the standard pattern for any asset Stellar has no native feed for (no
  protocol has a trustless on-chain AAPL price), but it does mean the
  pusher's key custody and the upstream stock API's accuracy are both
  trust assumptions, not cryptographic guarantees.
- **ZK proof binding**: the circuit binds a proof to one wallet address via
  a SHA256 commitment (see `circuits/portfolio_threshold.circom` for why
  Poseidon was deliberately avoided — curve-specific round constants).
  `lending::submit_proof` requires the caller's own signature, so a stolen
  proof can't be replayed by a different address, but a *valid* proof can
  be resubmitted by its rightful owner indefinitely until
  `proof_validity_secs` is tuned down.
- **Borrow sizing**: deliberately sized from a known-amount collateral lock
  in the vault, not from the (private) proof's hidden portfolio value —
  see the module doc comment at the top of `lending/src/lib.rs`.
- **Trusted setup**: `scripts/build_circuit.sh` runs a single-contributor
  ceremony. Fine for a hackathon demo; not fine for real funds.
