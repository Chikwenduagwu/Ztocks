#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, vec, Env};

mod oracle_wasm {
    soroban_sdk::contractimport!(
        file = "../price-oracle/target/wasm32v1-none/release/price_oracle.wasm"
    );
}

fn create_token<'a>(e: &Env, admin: &Address) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

fn setup() -> (
    Env,
    VaultContractClient<'static>,
    Address,         // user
    token::Client<'static>,
    token::StellarAssetClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let pusher = Address::generate(&env);

    let (usdc, usdc_admin) = create_token(&env, &admin);
    usdc_admin.mint(&user, &1_000_000_000_000i128); // 1,000,000 USDC at 1e6 scale

    let oracle_id = env.register(oracle_wasm::WASM, ());
    let oracle_client = oracle_wasm::Client::new(&env, &oracle_id);
    let assets = vec![&env, Symbol::new(&env, "AAPLX"), Symbol::new(&env, "TSLAX")];
    oracle_client.initialize(&admin, &pusher, &assets);
    oracle_client.push_price(&Symbol::new(&env, "AAPLX"), &200_000_000i128); // $200.00

    let vault_id = env.register(VaultContract, ());
    let vault = VaultContractClient::new(&env, &vault_id);
    vault.initialize(&admin, &usdc.address, &oracle_id, &assets);

    (env, vault, user, usdc, usdc_admin)
}

#[test]
fn test_deposit_and_withdraw() {
    let (_env, vault, user, usdc, _admin) = setup();

    vault.deposit(&user, &100_000_000i128); // 100 USDC
    let (free, _locked, _h) = vault.get_portfolio(&user);
    assert_eq!(free, 100_000_000i128);
    assert_eq!(usdc.balance(&user), 1_000_000_000_000i128 - 100_000_000i128);

    vault.withdraw(&user, &40_000_000i128);
    let (free2, _locked, _h) = vault.get_portfolio(&user);
    assert_eq!(free2, 60_000_000i128);
}

#[test]
fn test_buy_fails_with_insufficient_balance() {
    let (env, vault, user, _usdc, _admin) = setup();

    vault.deposit(&user, &100_000_000i128); // 100 USDC free
    // price is 200_000_000 (1e6-scaled $200/share); buying 10 shares
    // costs 2000 USDC, which exceeds the 100 USDC deposited.
    let result = vault.try_buy(&user, &Symbol::new(&env, "AAPLX"), &10_000_000i128);
    assert!(result.is_err());

    let (free, _locked, holdings) = vault.get_portfolio(&user);
    assert_eq!(holdings.get(Symbol::new(&env, "AAPLX")).unwrap_or(0), 0i128);
    assert_eq!(free, 100_000_000i128);
}

#[test]
fn test_buy_with_sufficient_balance() {
    let (env, vault, user, _usdc, _admin) = setup();

    vault.deposit(&user, &5_000_000_000i128); // 5,000 USDC free
    vault.buy(&user, &Symbol::new(&env, "AAPLX"), &10_000_000i128); // 10 AAPLx @ $200 = 2000 USDC

    let (free, _locked, holdings) = vault.get_portfolio(&user);
    assert_eq!(holdings.get(Symbol::new(&env, "AAPLX")).unwrap(), 10_000_000i128);
    assert_eq!(free, 5_000_000_000i128 - 2_000_000_000i128);
}

#[test]
fn test_sell_synthetic_stock() {
    let (env, vault, user, _usdc, _admin) = setup();

    vault.deposit(&user, &5_000_000_000i128);
    vault.buy(&user, &Symbol::new(&env, "AAPLX"), &10_000_000i128);
    vault.sell(&user, &Symbol::new(&env, "AAPLX"), &4_000_000i128);

    let (free, _locked, holdings) = vault.get_portfolio(&user);
    assert_eq!(holdings.get(Symbol::new(&env, "AAPLX")).unwrap(), 6_000_000i128);
    assert_eq!(free, 5_000_000_000i128 - 2_000_000_000i128 + 800_000_000i128);
}

#[test]
fn test_portfolio_value() {
    let (env, vault, user, _usdc, _admin) = setup();

    vault.deposit(&user, &5_000_000_000i128);
    vault.buy(&user, &Symbol::new(&env, "AAPLX"), &10_000_000i128);

    let value = vault.portfolio_value(&user);
    // free (3000) + 10 AAPLx @ $200 (2000) = 5000 USDC, 1e6-scaled
    assert_eq!(value, 5_000_000_000i128);
}
