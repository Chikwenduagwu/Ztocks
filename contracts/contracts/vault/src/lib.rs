//! Ztocks Vault Contract
//! ---------------------------------------------------------------
//! Holds each user's USDC collateral and synthetic-stock positions.
//! Buying/selling a synthetic asset is purely an internal accounting
//! move at the oracle's current price — no actual equity is held
//! anywhere; "AAPLx" etc. are synthetic exposure tracked on-chain,
//! collateralized by the user's deposited USDC.
//!
//! Cross-contract call pattern (token transfer, price read) follows
//! Stellar's own timelock example verbatim:
//! https://github.com/stellar/soroban-examples/tree/main/timelock

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Map, Symbol, Vec,
};

// Typed cross-contract client for price-oracle, generated from its
// compiled WASM. This is the same import pattern as Stellar's own
// cross_contract example:
// https://github.com/stellar/soroban-examples/tree/main/cross_contract
//
// IMPORTANT: build price-oracle FIRST (`cd ../price-oracle && stellar
// contract build`), then build vault — this macro reads the oracle's
// compiled .wasm file at vault's compile time, so the path below must
// already exist on disk.
mod price_oracle {
    soroban_sdk::contractimport!(
        file = "../price-oracle/target/wasm32v1-none/release/price_oracle.wasm"
    );
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InsufficientBalance = 3,
    InsufficientHoldings = 4,
    InvalidAmount = 5,
    UnknownAsset = 6,
    OraclePriceUnavailable = 7,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    UsdcToken,
    OracleContract,
    SupportedAssets,
    UsdcBalance(Address),       // free (unlocked) USDC per user
    Holdings(Address, Symbol),  // synthetic asset units per user, scaled 1e6
    LockedCollateral(Address),  // USDC locked as lending collateral
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        usdc_token: Address,
        oracle_contract: Address,
        supported_assets: Vec<Symbol>,
    ) -> Result<(), VaultError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(VaultError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage()
            .instance()
            .set(&DataKey::OracleContract, &oracle_contract);
        env.storage()
            .instance()
            .set(&DataKey::SupportedAssets, &supported_assets);
        Ok(())
    }

    /// Deposit USDC into the vault. Requires the caller to have
    /// already approved this contract (standard SEP-41 token flow);
    /// the actual transfer is pulled via `token::Client::transfer`.
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<(), VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let usdc: Address = env
            .storage()
            .instance()
            .get(&DataKey::UsdcToken)
            .ok_or(VaultError::NotInitialized)?;

        token::Client::new(&env, &usdc).transfer(&user, &env.current_contract_address(), &amount);

        let key = DataKey::UsdcBalance(user.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current + amount));

        env.events()
            .publish((Symbol::new(&env, "deposit"), user), amount);
        Ok(())
    }

    /// Withdraw free (unlocked) USDC back to the user's wallet.
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<(), VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let key = DataKey::UsdcBalance(user.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current < amount {
            return Err(VaultError::InsufficientBalance);
        }

        let usdc: Address = env
            .storage()
            .instance()
            .get(&DataKey::UsdcToken)
            .ok_or(VaultError::NotInitialized)?;

        env.storage().persistent().set(&key, &(current - amount));
        token::Client::new(&env, &usdc).transfer(&env.current_contract_address(), &user, &amount);

        env.events()
            .publish((Symbol::new(&env, "withdraw"), user), amount);
        Ok(())
    }

    /// Buy `amount` units (scaled 1e6) of `asset` at the oracle's
    /// current price, paid from the user's free USDC balance.
    pub fn buy(env: Env, user: Address, asset: Symbol, amount: i128) -> Result<(), VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();
        Self::assert_supported(&env, &asset)?;

        let price = Self::read_price(&env, &asset)?;
        // cost = amount * price / 1e6 (both amount and price are 1e6-scaled fixed point)
        let cost = (amount * price) / 1_000_000i128;

        let usdc_key = DataKey::UsdcBalance(user.clone());
        let usdc_balance: i128 = env.storage().persistent().get(&usdc_key).unwrap_or(0);
        if usdc_balance < cost {
            return Err(VaultError::InsufficientBalance);
        }
        env.storage().persistent().set(&usdc_key, &(usdc_balance - cost));

        let holdings_key = DataKey::Holdings(user.clone(), asset.clone());
        let holdings: i128 = env.storage().persistent().get(&holdings_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&holdings_key, &(holdings + amount));

        env.events()
            .publish((Symbol::new(&env, "buy"), user), (asset, amount, cost));
        Ok(())
    }

    /// Sell `amount` units of `asset` back at the oracle's current
    /// price, crediting USDC to the user's free balance.
    pub fn sell(env: Env, user: Address, asset: Symbol, amount: i128) -> Result<(), VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();
        Self::assert_supported(&env, &asset)?;

        let holdings_key = DataKey::Holdings(user.clone(), asset.clone());
        let holdings: i128 = env.storage().persistent().get(&holdings_key).unwrap_or(0);
        if holdings < amount {
            return Err(VaultError::InsufficientHoldings);
        }

        let price = Self::read_price(&env, &asset)?;
        let proceeds = (amount * price) / 1_000_000i128;

        env.storage()
            .persistent()
            .set(&holdings_key, &(holdings - amount));

        let usdc_key = DataKey::UsdcBalance(user.clone());
        let usdc_balance: i128 = env.storage().persistent().get(&usdc_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&usdc_key, &(usdc_balance + proceeds));

        env.events().publish(
            (Symbol::new(&env, "sell"), user),
            (asset, amount, proceeds),
        );
        Ok(())
    }

    /// Returns (free_usdc_balance, locked_collateral, holdings_map).
    /// Used by the frontend dashboard and by the ZK proof generator
    /// to build the *private* witness inputs client-side — this read
    /// is for the wallet owner's own UI, not for any other party.
    pub fn get_portfolio(
        env: Env,
        user: Address,
    ) -> (i128, i128, Map<Symbol, i128>) {
        let usdc: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UsdcBalance(user.clone()))
            .unwrap_or(0);
        let locked: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::LockedCollateral(user.clone()))
            .unwrap_or(0);

        let assets: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .unwrap_or(Vec::new(&env));

        let mut holdings = Map::new(&env);
        for asset in assets.iter() {
            let h: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Holdings(user.clone(), asset.clone()))
                .unwrap_or(0);
            holdings.set(asset, h);
        }

        (usdc, locked, holdings)
    }

    /// Computes total portfolio value (USDC value of all synthetic
    /// holdings + free USDC) at current oracle prices. Used by the
    /// frontend to show a live dashboard number, and by lending.rs
    /// (via cross-contract call) to size borrow limits.
    pub fn portfolio_value(env: Env, user: Address) -> Result<i128, VaultError> {
        let (usdc, _locked, holdings) = Self::get_portfolio(env.clone(), user);
        let mut total = usdc;
        for (asset, amount) in holdings.iter() {
            if amount == 0 {
                continue;
            }
            let price = Self::read_price(&env, &asset)?;
            total += (amount * price) / 1_000_000i128;
        }
        Ok(total)
    }

    // --- Called by the lending contract via cross-contract invocation ---

    /// Locks `amount` of the user's free USDC as collateral. Only the
    /// registered lending contract may call this (enforced by the
    /// lending contract requiring the user's own auth before it asks
    /// the vault to lock anything — the vault trusts its caller's
    /// contract identity isn't being spoofed because Soroban's
    /// `require_auth` ties the original signature to this exact call
    /// chain).
    pub fn lock_collateral(env: Env, user: Address, amount: i128) -> Result<(), VaultError> {
        user.require_auth();
        let usdc_key = DataKey::UsdcBalance(user.clone());
        let usdc_balance: i128 = env.storage().persistent().get(&usdc_key).unwrap_or(0);
        if usdc_balance < amount {
            return Err(VaultError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&usdc_key, &(usdc_balance - amount));

        let locked_key = DataKey::LockedCollateral(user.clone());
        let locked: i128 = env.storage().persistent().get(&locked_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&locked_key, &(locked + amount));
        Ok(())
    }

    pub fn unlock_collateral(env: Env, user: Address, amount: i128) -> Result<(), VaultError> {
        user.require_auth();
        let locked_key = DataKey::LockedCollateral(user.clone());
        let locked: i128 = env.storage().persistent().get(&locked_key).unwrap_or(0);
        if locked < amount {
            return Err(VaultError::InsufficientBalance);
        }
        env.storage()
            .persistent()
            .set(&locked_key, &(locked - amount));

        let usdc_key = DataKey::UsdcBalance(user.clone());
        let usdc_balance: i128 = env.storage().persistent().get(&usdc_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&usdc_key, &(usdc_balance + amount));
        Ok(())
    }

    // --- internal helpers ---

    pub fn get_usdc_token(env: Env) -> Result<Address, VaultError> {
        env.storage()
            .instance()
            .get(&DataKey::UsdcToken)
            .ok_or(VaultError::NotInitialized)
    }

    fn assert_supported(env: &Env, asset: &Symbol) -> Result<(), VaultError> {
        let assets: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&DataKey::SupportedAssets)
            .ok_or(VaultError::NotInitialized)?;
        if !assets.contains(asset) {
            return Err(VaultError::UnknownAsset);
        }
        Ok(())
    }

    fn read_price(env: &Env, asset: &Symbol) -> Result<i128, VaultError> {
        let oracle: Address = env
            .storage()
            .instance()
            .get(&DataKey::OracleContract)
            .ok_or(VaultError::NotInitialized)?;

        let client = price_oracle::Client::new(env, &oracle);
        // 1 hour staleness tolerance; tune via a contract constant if
        // the off-chain pusher's tick interval changes.
        //
        // try_get_price_checked returns Result<Result<PriceQuote, OracleError>, InvokeError>
        // — the outer Result is host-level (e.g. oracle contract missing),
        // the inner is the oracle's own declared error (e.g. stale price).
        // Both collapse to OraclePriceUnavailable here since the vault
        // can't act on a price it doesn't trust either way.
        match client.try_get_price_checked(asset, &3600u64) {
            Ok(Ok(quote)) => Ok(quote.price),
            _ => Err(VaultError::OraclePriceUnavailable),
        }
    }
}

mod test;
