#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, vec as svec, Env};

mod oracle_wasm {
    soroban_sdk::contractimport!(
        file = "../price-oracle/target/wasm32v1-none/release/price_oracle.wasm"
    );
}
mod vault_wasm {
    soroban_sdk::contractimport!(file = "../vault/target/wasm32v1-none/release/vault.wasm");
}

fn create_token<'a>(
    e: &Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

struct TestSetup {
    env: Env,
    lending: LendingContractClient<'static>,
    vault: vault_wasm::Client<'static>,
    user: Address,
    usdc: token::Client<'static>,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let pusher = Address::generate(&env);
    let user = Address::generate(&env);

    let (usdc, usdc_admin) = create_token(&env, &admin);
    usdc_admin.mint(&user, &1_000_000_000_000i128);

    let assets = svec![&env, Symbol::new(&env, "AAPLX")];

    let oracle_id = env.register(oracle_wasm::WASM, ());
    let oracle = oracle_wasm::Client::new(&env, &oracle_id);
    oracle.initialize(&admin, &pusher, &assets);
    oracle.push_price(&Symbol::new(&env, "AAPLX"), &200_000_000i128);

    let vault_id = env.register(vault_wasm::WASM, ());
    let vault = vault_wasm::Client::new(&env, &vault_id);
    vault.initialize(&admin, &usdc.address, &oracle_id, &assets);

    // NOTE: zk-verifier requires a real Groth16 verifying key to do
    // anything meaningful; before scripts/build_circuit.sh has run,
    // vkey.rs still contains zero-filled placeholder bytes. Calling
    // verify()/try_verify() against those placeholder points is
    // UNTESTED here and may panic at the BLS12-381 host-function
    // level (on-curve/subgroup checks happen inside g1_mul/
    // pairing_check itself, not at G1Affine::from_array construction
    // time — see Stellar's own groth16_verifier/src/test.rs, which
    // only ever exercises real, ceremony-derived points). Do NOT call
    // lending.submit_proof() or anything that reaches zk-verifier's
    // verify() until the real vkey.rs has been generated — these
    // lending tests therefore only cover the borrow-limit/collateral
    // math and the "no proof submitted yet" rejection path, which
    // never touches the verifier contract at all.
    mod verifier_wasm {
        soroban_sdk::contractimport!(
            file = "../zk-verifier/target/wasm32v1-none/release/zk_verifier.wasm"
        );
    }
    let verifier_id = env.register(verifier_wasm::WASM, ());

    let lending_id = env.register(LendingContract, ());
    let lending = LendingContractClient::new(&env, &lending_id);
    lending.initialize(&admin, &vault_id, &verifier_id, &425u32, &8500u32, &3600u64);

    // Fund the lending pool so borrow() has USDC to disburse.
    usdc_admin.mint(&lending_id, &10_000_000_000_000i128);

    TestSetup {
        env,
        lending,
        vault,
        user,
        usdc,
    }
}

#[test]
fn test_borrow_rejected_without_proof() {
    let t = setup();
    t.vault.deposit(&t.user, &5_000_000_000i128);

    let result = t.lending.try_borrow(&t.user, &1_000_000_000i128, &500_000_000i128);
    assert!(result.is_err());
}

#[test]
fn test_health_factor_no_debt_is_infinite_sentinel() {
    let t = setup();
    let hf = t.lending.health_factor(&t.user);
    assert_eq!(hf, -1i128);
}

#[test]
fn test_get_position_starts_at_zero() {
    let t = setup();
    let (debt, collateral) = t.lending.get_position(&t.user);
    assert_eq!(debt, 0i128);
    assert_eq!(collateral, 0i128);
}

#[test]
fn test_repay_more_than_debt_rejected() {
    let t = setup();
    let result = t.lending.try_repay(&t.user, &100i128);
    assert!(result.is_err());
}

// See NOTE in setup() — full borrow/repay happy-path tests against a
// real, passing ZK proof require the circuit's trusted setup to have
// run first. Add a `test_full_borrow_lifecycle` here once
// circuits/build/verification_key.json exists, using a snarkjs-
// generated proof for circuits/input.example.json as the fixture.
