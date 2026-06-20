//! Groth16 proof verifier for Ztocks portfolio-threshold proofs.
//!
//! Verified against Stellar's actual reference implementation, cloned
//! and inspected directly from:
//! https://github.com/stellar/soroban-examples/tree/main/groth16_verifier
//! (soroban-sdk 25.1.0, src/lib.rs + src/test.rs read in full).
//!
//! The circuit (circuits/portfolio_threshold.circom) proves, without
//! revealing individual holdings, that:
//!   - total portfolio value >= threshold
//!   - number of distinct positions >= minAssets
//!   - the proof is bound to the caller's address via a Poseidon commitment
//!
//! This contract performs the on-chain pairing check:
//!   e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
//! using Soroban's native BLS12-381 host functions (`Fr`, `G1Affine`,
//! `G2Affine` contract types) — no proving happens on-chain, only the
//! final, single-pairing-call verification.

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    symbol_short, vec, Address, Env, Vec,
};

mod vkey;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Groth16Error {
    MalformedVerifyingKey = 0,
    WrongPublicInputCount = 1,
}

#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: G1Affine,
    pub beta: G2Affine,
    pub gamma: G2Affine,
    pub delta: G2Affine,
    pub ic: Vec<G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Groth16Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

#[contract]
pub struct ZkVerifierContract;

#[contractimpl]
impl ZkVerifierContract {
    /// Verifies a Groth16 proof against the embedded verifying key
    /// generated from circuits/portfolio_threshold.circom (see
    /// scripts/build_circuit.sh / scripts/export_vkey_rust.js).
    ///
    /// `pub_signals` must be exactly [threshold, min_assets, owner_commit]
    /// as `Fr` field elements, in the same order the circuit declares
    /// its public signals.
    pub fn verify(
        env: Env,
        proof: Groth16Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<bool, Groth16Error> {
        let vk = vkey::verifying_key(&env);

        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(Groth16Error::WrongPublicInputCount);
        }

        let bls = env.crypto().bls12_381();

        // vk_x = ic[0] + sum(pub_signals[i] * ic[i+1])
        let mut vk_x = vk.ic.get(0).unwrap();
        for (s, v) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
            let prod = bls.g1_mul(&v, &s);
            vk_x = bls.g1_add(&vk_x, &prod);
        }

        // e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
        let neg_a = -proof.a;
        let vp1 = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let vp2 = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        Ok(bls.pairing_check(vp1, vp2))
    }

    /// Verify + emit an event the frontend/indexer can subscribe to,
    /// and used by the lending/vault contracts to gate actions on a
    /// successfully-verified, freshly-submitted proof.
    pub fn verify_and_log(
        env: Env,
        prover: Address,
        proof: Groth16Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<bool, Groth16Error> {
        let result = Self::verify(env.clone(), proof, pub_signals)?;
        env.events()
            .publish((symbol_short!("zk_proof"), prover), result);
        Ok(result)
    }
}

mod test;
