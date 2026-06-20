//! Price Oracle Contract
//! ---------------------------------------------------------------
//! Stellar has no native price feed for individual US equities —
//! Reflector and similar Soroban oracles cover FX/crypto/DEX pairs,
//! not AAPL/TSLA/NVDA/GOOGL tickers. This contract is the on-chain
//! half of a standard "pushed oracle" pattern: a permissioned
//! off-chain service (scripts/price_pusher in the frontend repo)
//! reads real quotes from a stock-data API and writes them here on
//! a fixed interval. The vault and lending contracts read prices
//! from this contract rather than trusting any caller-supplied price.
//!
//! This is the same pattern used by every tokenized-equity protocol
//! that doesn't have a native on-chain feed for its underlying asset —
//! the trust assumption (you're trusting the pusher's data source and
//! its key custody) is stated explicitly here rather than hidden.

#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAuthorized = 3,
    UnknownAsset = 4,
    StalePrice = 5,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Pusher,
    Price(Symbol),       // e.g. Symbol::new(&env, "AAPLX")
    SupportedAssets,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct PriceQuote {
    /// Price scaled by 1e6 (matches the circuit's fixed-point convention).
    pub price: i128,
    /// Ledger timestamp (unix seconds) when this quote was written.
    pub updated_at: u64,
}

#[contract]
pub struct PriceOracleContract;

#[contractimpl]
impl PriceOracleContract {
    /// One-time setup. `admin` can rotate the pusher key; `pusher` is
    /// the address whose signature is required on every price update
    /// (this is the off-chain script's Stellar keypair).
    pub fn initialize(
        env: Env,
        admin: Address,
        pusher: Address,
        supported_assets: Vec<Symbol>,
    ) -> Result<(), OracleError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(OracleError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Pusher, &pusher);
        env.storage()
            .instance()
            .set(&DataKey::SupportedAssets, &supported_assets);
        Ok(())
    }

    /// Push a fresh price for one asset. Only callable by the
    /// registered pusher address. Called once per tick (e.g. every
    /// 60s) by the off-chain price-pusher script for each of
    /// AAPLx/TSLAx/NVDAx/GOOGLx.
    pub fn push_price(
        env: Env,
        asset: Symbol,
        price: i128,
    ) -> Result<(), OracleError> {
        let pusher: Address = env
            .storage()
            .instance()
            .get(&DataKey::Pusher)
            .ok_or(OracleError::NotInitialized)?;
        pusher.require_auth();

        let supported: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .ok_or(OracleError::NotInitialized)?;
        if !supported.contains(&asset) {
            return Err(OracleError::UnknownAsset);
        }

        let quote = PriceQuote {
            price,
            updated_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Price(asset.clone()), &quote);

        env.events().publish((Symbol::new(&env, "price_update"), asset), price);
        Ok(())
    }

    /// Push prices for several assets in one transaction (cheaper for
    /// the pusher than N separate calls each tick).
    pub fn push_prices(
        env: Env,
        assets: Vec<Symbol>,
        prices: Vec<i128>,
    ) -> Result<(), OracleError> {
        if assets.len() != prices.len() {
            return Err(OracleError::UnknownAsset);
        }
        for (asset, price) in assets.iter().zip(prices.iter()) {
            Self::push_price(env.clone(), asset, price)?;
        }
        Ok(())
    }

    /// Read the latest price for an asset. Callers (vault, lending)
    /// should treat a quote older than their own staleness tolerance
    /// as unusable — this contract just returns what it has plus the
    /// timestamp, and leaves the staleness policy to the caller.
    pub fn get_price(env: Env, asset: Symbol) -> Result<PriceQuote, OracleError> {
        env.storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::UnknownAsset)
    }

    /// Convenience: get_price but reject if older than `max_age_secs`.
    pub fn get_price_checked(
        env: Env,
        asset: Symbol,
        max_age_secs: u64,
    ) -> Result<PriceQuote, OracleError> {
        let quote = Self::get_price(env.clone(), asset)?;
        let now = env.ledger().timestamp();
        if now.saturating_sub(quote.updated_at) > max_age_secs {
            return Err(OracleError::StalePrice);
        }
        Ok(quote)
    }

    pub fn rotate_pusher(env: Env, new_pusher: Address) -> Result<(), OracleError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Pusher, &new_pusher);
        Ok(())
    }

    pub fn supported_assets(env: Env) -> Result<Vec<Symbol>, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .ok_or(OracleError::NotInitialized)
    }
}

mod test;
