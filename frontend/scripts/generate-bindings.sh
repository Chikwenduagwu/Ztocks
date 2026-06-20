#!/bin/bash
set -e

# ============================================================
# Generates fully-typed TypeScript bindings packages for each
# deployed Soroban contract, using the Stellar CLI's official
# bindings generator. Confirmed real command per Stellar's own
# docs (developers.stellar.org/docs/build/apps/guestbook/bindings
# and the Hello World frontend tutorial).
#
# Run this AFTER deploying all 4 contracts (see
# ztocks-contracts/contracts/README.md) and setting their
# contract IDs in .env.local.
#
# Usage:
#   chmod +x scripts/generate-bindings.sh
#   ./scripts/generate-bindings.sh
# ============================================================

source .env.local 2>/dev/null || {
  echo "No .env.local found. Copy .env.example to .env.local and fill in contract IDs first."
  exit 1
}

NETWORK="${NEXT_PUBLIC_STELLAR_NETWORK:-testnet}"
OUT_DIR="./packages"

mkdir -p "$OUT_DIR"

generate() {
  local name=$1
  local contract_id=$2
  if [ -z "$contract_id" ]; then
    echo "Skipping $name — no contract ID set in .env.local"
    return
  fi
  echo "==> Generating bindings for $name ($contract_id)..."
  stellar contract bindings typescript \
    --network "$NETWORK" \
    --contract-id "$contract_id" \
    --output-dir "$OUT_DIR/$name" \
    --overwrite

  echo "    Building $name package..."
  (cd "$OUT_DIR/$name" && npm install --silent && npm run build --silent)
}

generate "price-oracle" "$NEXT_PUBLIC_ORACLE_CONTRACT_ID"
generate "vault" "$NEXT_PUBLIC_VAULT_CONTRACT_ID"
generate "lending" "$NEXT_PUBLIC_LENDING_CONTRACT_ID"
generate "zk-verifier" "$NEXT_PUBLIC_ZK_VERIFIER_CONTRACT_ID"

echo ""
echo "Done. Generated packages are in $OUT_DIR/."
echo "Add them as local dependencies in package.json, e.g.:"
echo '  "vault-client": "file:./packages/vault"'
echo "then re-run npm install."
