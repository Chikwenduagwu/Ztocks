#!/bin/bash
set -e

# ============================================================
# Ztocks ZK Circuit Build Script
# ------------------------------------------------------------
# Compiles portfolio_threshold.circom for the BLS12-381 curve
# (required — Soroban's native pairing host functions only
# support BLS12-381, not circom's bn128 default), runs a local
# Powers-of-Tau + Groth16 trusted setup, and produces the
# artifacts the Soroban verifier contract and frontend prover
# need.
#
# Prereqs (install locally — not available in this sandbox):
#   - circom 2.x        (https://docs.circom.io/getting-started/installation/)
#   - node + npm
#   - snarkjs            (npm install -g snarkjs)
#   - rust + cargo       (for the gen_vkey conversion binary)
#
# Usage:
#   chmod +x build_circuit.sh
#   ./build_circuit.sh
# ============================================================

CIRCUIT_NAME="portfolio_threshold"
BUILD_DIR="./build"
CIRCUITS_DIR="./circuits"

echo "==> [1/8] Installing circomlib (Poseidon, comparators)..."
mkdir -p "$CIRCUITS_DIR/node_modules"
npm install circomlib --prefix "$CIRCUITS_DIR" --no-save

mkdir -p "$BUILD_DIR"

echo "==> [2/8] Compiling circuit to R1CS + WASM (curve: bls12381)..."
circom "$CIRCUITS_DIR/$CIRCUIT_NAME.circom" \
  --r1cs --wasm --sym \
  --prime bls12381 \
  -o "$BUILD_DIR" \
  -l "$CIRCUITS_DIR/node_modules"

echo "==> [3/8] Starting Powers of Tau ceremony (bls12-381, 2^14)..."
# NOTE: production deployments must use a multi-party ceremony.
# This single-contributor setup is acceptable for hackathon/testnet only.
snarkjs powersoftau new bls12-381 14 "$BUILD_DIR/pot14_0000.ptau" -v
snarkjs powersoftau contribute "$BUILD_DIR/pot14_0000.ptau" "$BUILD_DIR/pot14_0001.ptau" \
  --name="Ztocks hackathon contribution" -v -e="$(date +%s)-ztocks-entropy"
snarkjs powersoftau prepare phase2 "$BUILD_DIR/pot14_0001.ptau" "$BUILD_DIR/pot14_final.ptau" -v

echo "==> [4/8] Running Groth16 setup..."
snarkjs groth16 setup \
  "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
  "$BUILD_DIR/pot14_final.ptau" \
  "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"

snarkjs zkey contribute \
  "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey" \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  --name="Ztocks key contribution" -v -e="$(date +%s)-ztocks-zkey-entropy"

echo "==> [5/8] Exporting verification key (JSON)..."
snarkjs zkey export verificationkey \
  "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" \
  "$BUILD_DIR/verification_key.json"

# Sanity check: confirm we actually got a bls12381 key, not bn128.
CURVE=$(node -e "console.log(require('./$BUILD_DIR/verification_key.json').curve)")
if [ "$CURVE" != "bls12381" ]; then
  echo "ERROR: verification_key.json reports curve='$CURVE', expected 'bls12381'."
  echo "       Check that circom was invoked with --prime bls12381 and that"
  echo "       the .ptau file was generated via 'snarkjs powersoftau new bls12-381'."
  exit 1
fi

echo "==> [6/8] Copying WASM witness generator for frontend proving..."
cp "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$BUILD_DIR/${CIRCUIT_NAME}.wasm"

echo "==> [7/8] Generating Rust verifying-key constants for Soroban contract..."
(cd ../contracts/zk-verifier && cargo run --quiet --bin gen_vkey --features genvkey -- \
  "../../circuits/$BUILD_DIR/verification_key.json" \
  "src/vkey.rs")

echo "==> [8/8] Done. Artifacts in $BUILD_DIR:"
ls -la "$BUILD_DIR"

echo ""
echo "Next steps:"
echo "  1. Copy $BUILD_DIR/${CIRCUIT_NAME}.wasm and ${CIRCUIT_NAME}_final.zkey"
echo "     into ztocks-frontend/public/zk/ for client-side proving."
echo "  2. cd ../contracts/zk-verifier && cargo build (verify vkey.rs compiles)"
echo "  3. Build + deploy all contracts (see contracts/README.md)."
