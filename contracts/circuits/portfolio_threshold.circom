pragma circom 2.0.0;

/*
 * PortfolioThreshold circuit
 * ---------------------------------------------------------
 * Proves, without revealing individual holdings:
 *   1. sum(holdings[i] * prices[i]) >= threshold   (solvency)
 *   2. number of non-zero positions       >= minAssets (diversification)
 *
 * Private inputs:
 *   holdings[N]  - token amount held per synthetic asset (scaled int, 1e6)
 *   prices[N]    - price per synthetic asset at proof time (scaled int, 1e6)
 *   salt         - random blinding factor, binds proof to a single session
 *
 * Public inputs:
 *   threshold    - minimum portfolio value required (scaled int, 1e6)
 *   minAssets    - minimum distinct non-zero positions required
 *   ownerCommit  - poseidon hash committing the prover to a wallet address,
 *                  prevents proof replay by a different account
 *
 * Public output:
 *   meetsThreshold - 1 if both conditions hold, 0 otherwise
 */

/*
 * PortfolioThreshold circuit
 * ---------------------------------------------------------
 * Proves, without revealing individual holdings:
 *   1. sum(holdings[i] * prices[i]) >= threshold   (solvency)
 *   2. number of non-zero positions       >= minAssets (diversification)
 *
 * Private inputs:
 *   holdings[N]  - token amount held per synthetic asset (scaled int, 1e6)
 *   prices[N]    - price per synthetic asset at proof time (scaled int, 1e6)
 *   salt         - random blinding factor, binds proof to a single session
 *
 * Public inputs:
 *   threshold    - minimum portfolio value required (scaled int, 1e6)
 *   minAssets    - minimum distinct non-zero positions required
 *   ownerCommit  - hash committing the prover to a wallet address,
 *                  prevents proof replay by a different account
 *
 * Public output:
 *   meetsThreshold - 1 if both conditions hold, 0 otherwise
 *
 * NOTE on hash choice: this circuit targets the BLS12-381 scalar
 * field (compiled with `circom --prime bls12381`, required because
 * Soroban's pairing host functions only support BLS12-381 — see
 * scripts/build_circuit.sh). circomlib's standard Poseidon() round
 * constants are generated for BN254's scalar field, not BLS12-381's;
 * reusing them under a different prime is a known footgun (see
 * https://github.com/iden3/circom/issues/298 for an example of
 * curve-dependent circuit bugs). A BLS12-381-specific Poseidon
 * variant exists (poseidon-bls12381-circom) but is an unaudited,
 * single-maintainer package — not something to depend on silently
 * for a contract that gates real lending collateral. Sha256 is used
 * instead: its round constants are bitwise (not field-arithmetic),
 * so it behaves identically regardless of which prime circom targets.
 */

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/sha256/sha256.circom";
include "node_modules/circomlib/circuits/bitify.circom";

template PortfolioThreshold(N) {
    signal input holdings[N];
    signal input prices[N];
    signal input salt;
    signal input ownerAddress;

    signal input threshold;
    signal input minAssets;
    signal input ownerCommit; // low 253 bits of SHA256(ownerAddress || salt)

    signal output meetsThreshold;

    // --- 1. Compute total portfolio value ---
    signal positionValue[N];
    signal partialSum[N + 1];
    partialSum[0] <== 0;

    for (var i = 0; i < N; i++) {
        positionValue[i] <== holdings[i] * prices[i];
        partialSum[i + 1] <== partialSum[i] + positionValue[i];
    }

    signal totalValue;
    totalValue <== partialSum[N];

    // --- 2. Count non-zero positions (diversification) ---
    component isZero[N];
    signal nonZero[N];
    signal partialCount[N + 1];
    partialCount[0] <== 0;

    for (var i = 0; i < N; i++) {
        isZero[i] = IsZero();
        isZero[i].in <== holdings[i];
        nonZero[i] <== 1 - isZero[i].out;
        partialCount[i + 1] <== partialCount[i] + nonZero[i];
    }

    signal assetCount;
    assetCount <== partialCount[N];

    // --- 3. Verify ownerCommit binds this proof to the caller's address ---
    // ownerAddress and salt are each decomposed to 128 bits (sufficient
    // for a blinding salt + a truncated address commitment) and fed
    // through Sha256(256) as a single 256-bit block.
    component addrBits = Num2Bits(128);
    addrBits.in <== ownerAddress;
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;

    component hasher = Sha256(256);
    for (var i = 0; i < 128; i++) {
        hasher.in[i] <== addrBits.out[127 - i];
        hasher.in[128 + i] <== saltBits.out[127 - i];
    }

    component hashBits2Num = Bits2Num(253);
    for (var i = 0; i < 253; i++) {
        hashBits2Num.in[i] <== hasher.out[255 - i];
    }
    hashBits2Num.out === ownerCommit;

    // --- 4. Threshold + diversification checks ---
    component gteValue = GreaterEqThan(64);
    gteValue.in[0] <== totalValue;
    gteValue.in[1] <== threshold;

    component gteAssets = GreaterEqThan(8);
    gteAssets.in[0] <== assetCount;
    gteAssets.in[1] <== minAssets;

    meetsThreshold <== gteValue.out * gteAssets.out;
}

// 4 synthetic assets: AAPLx, TSLAx, NVDAx, GOOGLx
component main { public [threshold, minAssets, ownerCommit] } = PortfolioThreshold(4);
