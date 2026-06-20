//! encode_proof — converts a snarkjs Groth16 `proof.json` (curve =
//! bls12381) into hex-encoded byte arrays ready to submit to the
//! zk-verifier contract's `verify`/`submit_proof` methods.
//!
//! This exists specifically so frontend code never has to hand-encode
//! BLS12-381 points in JavaScript — see the large warning comment in
//! ztocks-frontend/hooks/useZkProof.ts for why that's a real risk
//! (ark-serialize has at least one documented cross-library byte-
//! format inconsistency: arkworks-rs/algebra#257, arkworks-rs/curves#14).
//! This binary uses the IDENTICAL ark-bls12-381 + ark-serialize call
//! path as gen_vkey.rs, so its output is guaranteed consistent with
//! what the deployed contract (built from the same crates) expects.
//!
//! Usage (run from contracts/zk-verifier/):
//!   cargo run --bin encode_proof --features genvkey -- \
//!       path/to/proof.json path/to/public.json
//!
//! Prints JSON to stdout: { "a": "0x...", "b": "0x...", "c": "0x...",
//! "publicSignals": ["...", "...", "..."] } — wire this into a small
//! local server or CLI step your frontend calls before submit_proof,
//! per useZkProof.ts's documented "safe path".

use ark_bls12_381::{Fq, Fq2};
use ark_serialize::CanonicalSerialize;
use core::str::FromStr;
use std::env;
use std::fs;

fn g1_hex(x: &str, y: &str) -> String {
    let p = ark_bls12_381::G1Affine::new(Fq::from_str(x).unwrap(), Fq::from_str(y).unwrap());
    let mut buf = [0u8; 96];
    p.serialize_uncompressed(&mut buf[..]).unwrap();
    format!("0x{}", hex_encode(&buf))
}

fn g2_hex(x1: &str, x2: &str, y1: &str, y2: &str) -> String {
    let x = Fq2::new(Fq::from_str(x1).unwrap(), Fq::from_str(x2).unwrap());
    let y = Fq2::new(Fq::from_str(y1).unwrap(), Fq::from_str(y2).unwrap());
    let p = ark_bls12_381::G2Affine::new(x, y);
    let mut buf = [0u8; 192];
    p.serialize_uncompressed(&mut buf[..]).unwrap();
    format!("0x{}", hex_encode(&buf))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn main() {
    let args: std::vec::Vec<String> = env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: encode_proof <proof.json> <public.json>");
        std::process::exit(1);
    }

    let proof_raw = fs::read_to_string(&args[1]).expect("failed to read proof.json");
    let proof: serde_json::Value = serde_json::from_str(&proof_raw).expect("invalid proof.json");

    let public_raw = fs::read_to_string(&args[2]).expect("failed to read public.json");
    let public_signals: std::vec::Vec<String> =
        serde_json::from_str(&public_raw).expect("invalid public.json (expected array of strings)");

    assert_eq!(
        proof["curve"].as_str().unwrap_or(""),
        "bls12381",
        "proof.json must be generated against the bls12381 curve (see scripts/build_circuit.sh)"
    );

    let s = |v: &serde_json::Value, i: usize| v[i].as_str().unwrap().to_string();

    let pi_a = &proof["pi_a"];
    let a_hex = g1_hex(&s(pi_a, 0), &s(pi_a, 1));

    let pi_b = &proof["pi_b"];
    let b_hex = g2_hex(
        &s(&pi_b[0], 0),
        &s(&pi_b[0], 1),
        &s(&pi_b[1], 0),
        &s(&pi_b[1], 1),
    );

    let pi_c = &proof["pi_c"];
    let c_hex = g1_hex(&s(pi_c, 0), &s(pi_c, 1));

    let output = serde_json::json!({
        "a": a_hex,
        "b": b_hex,
        "c": c_hex,
        "publicSignals": public_signals,
    });

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}
