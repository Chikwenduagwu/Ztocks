#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{symbol_short, vec, Env};

fn setup() -> (Env, PriceOracleContractClient<'static>, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let pusher = Address::generate(&env);
    let contract_id = env.register(PriceOracleContract, ());
    let client = PriceOracleContractClient::new(&env, &contract_id);

    let assets = vec![
        &env,
        Symbol::new(&env, "AAPLX"),
        Symbol::new(&env, "TSLAX"),
        Symbol::new(&env, "NVDAX"),
        Symbol::new(&env, "GOOGLX"),
    ];

    env.mock_all_auths();
    client.initialize(&admin, &pusher, &assets);

    (env, client, admin, pusher)
}

#[test]
fn test_push_and_read_price() {
    let (env, client, _admin, _pusher) = setup();
    env.mock_all_auths();

    client.push_price(&Symbol::new(&env, "AAPLX"), &213_570_000i128);

    let quote = client.get_price(&Symbol::new(&env, "AAPLX"));
    assert_eq!(quote.price, 213_570_000i128);
}

#[test]
fn test_stale_price_rejected() {
    let (env, client, _admin, _pusher) = setup();
    env.mock_all_auths();

    client.push_price(&Symbol::new(&env, "TSLAX"), &178_320_000i128);

    env.ledger().with_mut(|li| li.timestamp += 3600);

    let result = client.try_get_price_checked(&Symbol::new(&env, "TSLAX"), &60u64);
    assert!(result.is_err());
}

#[test]
fn test_unknown_asset_rejected() {
    let (env, client, _admin, _pusher) = setup();
    env.mock_all_auths();

    let result = client.try_push_price(&Symbol::new(&env, "MSFTX"), &100_000_000i128);
    assert!(result.is_err());
}

#[test]
fn test_batch_push() {
    let (env, client, _admin, _pusher) = setup();
    env.mock_all_auths();

    let assets = vec![&env, Symbol::new(&env, "AAPLX"), Symbol::new(&env, "NVDAX")];
    let prices = vec![&env, 213_570_000i128, 891_460_000i128];
    client.push_prices(&assets, &prices);

    assert_eq!(client.get_price(&Symbol::new(&env, "AAPLX")).price, 213_570_000i128);
    assert_eq!(client.get_price(&Symbol::new(&env, "NVDAX")).price, 891_460_000i128);
}

#[test]
fn test_rotate_pusher() {
    let (env, client, _admin, _pusher) = setup();
    env.mock_all_auths();

    let new_pusher = Address::generate(&env);
    client.rotate_pusher(&new_pusher);
    // Old pusher's auth is no longer the registered one; this just
    // confirms the call succeeds and storage updates without panicking.
}
