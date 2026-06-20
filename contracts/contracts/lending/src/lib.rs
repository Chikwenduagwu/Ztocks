//! Ztocks Lending Contract
//! ---------------------------------------------------------------
//! Lets a user borrow USDC against their vault collateral without
//! revealing their actual holdings to this contract or anyone
//! watching the chain. Borrowing requires a fresh Groth16 proof
//! (verified by zk-verifier) attesting "portfolio value >= threshold
//! AND positions >= minAssets" — the contract never sees the
//! underlying holdings, only the proof's pass/fail result plus the
//! USDC amount the user separately locks via vault::lock_collateral.
//!
//! Trust model, stated plainly: this contract trusts the ZK proof
//! for solvency *shape* (above some threshold, diversified), but the
//! actual borrow limit is still computed from a known-size collateral
//! lock in the vault, not from the (necessarily hidden) portfolio
//! value itself. This is what makes the privacy actually load-bearing
//! rather than decorative — a naive design that read portfolio_value
//! directly for sizing would defeat the entire point of the proof.

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token,
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    Address, Env, Symbol, Vec,
};

mod vault_contract {
    soroban_sdk::contractimport!(file = "../vault/target/wasm32v1-none/release/vault.wasm");
}

mod zk_verifier_contract {
    soroban_sdk::contractimport!(
        file = "../zk-verifier/target/wasm32v1-none/release/zk_verifier.wasm"
    );
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum LendingError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    NoValidProof = 4,
    ExceedsBorrowLimit = 5,
    InsufficientCollateral = 6,
    RepayExceedsDebt = 7,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    VaultContract,
    ZkVerifierContract,
    BorrowApyBps,          // e.g. 425 = 4.25%
    LiquidationLtvBps,     // e.g. 8500 = 85%
    CollateralLocked(Address),
    Debt(Address),
    ProofVerifiedAt(Address), // ledger timestamp of last accepted proof
    ProofValiditySecs,
}

#[derive(Clone)]
#[contracttype]
pub struct Groth16Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

#[contract]
pub struct LendingContract;

#[contractimpl]
impl LendingContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        vault_contract: Address,
        zk_verifier_contract: Address,
        borrow_apy_bps: u32,
        liquidation_ltv_bps: u32,
        proof_validity_secs: u64,
    ) -> Result<(), LendingError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(LendingError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::VaultContract, &vault_contract);
        env.storage()
            .instance()
            .set(&DataKey::ZkVerifierContract, &zk_verifier_contract);
        env.storage()
            .instance()
            .set(&DataKey::BorrowApyBps, &borrow_apy_bps);
        env.storage()
            .instance()
            .set(&DataKey::LiquidationLtvBps, &liquidation_ltv_bps);
        env.storage()
            .instance()
            .set(&DataKey::ProofValiditySecs, &proof_validity_secs);
        Ok(())
    }

    /// Submit a fresh ZK proof of solvency/diversification. Must be
    /// called (and pass) before `borrow` — `borrow` checks
    /// `ProofVerifiedAt` is within `ProofValiditySecs` of now.
    pub fn submit_proof(
        env: Env,
        user: Address,
        proof: Groth16Proof,
        threshold: Fr,
        min_assets: Fr,
        owner_commit: Fr,
    ) -> Result<bool, LendingError> {
        user.require_auth();

        let verifier_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::ZkVerifierContract)
            .ok_or(LendingError::NotInitialized)?;

        let verifier_proof = zk_verifier_contract::Groth16Proof {
            a: proof.a,
            b: proof.b,
            c: proof.c,
        };
        let pub_signals = Vec::from_array(&env, [threshold, min_assets, owner_commit]);

        let client = zk_verifier_contract::Client::new(&env, &verifier_id);
        let valid = match client.try_verify(&verifier_proof, &pub_signals) {
            Ok(Ok(v)) => v,
            _ => false,
        };

        if valid {
            env.storage()
                .persistent()
                .set(&DataKey::ProofVerifiedAt(user.clone()), &env.ledger().timestamp());
        }

        env.events()
            .publish((Symbol::new(&env, "proof_submitted"), user), valid);

        if !valid {
            return Err(LendingError::NoValidProof);
        }
        Ok(true)
    }

    /// Lock `collateral_amount` of the user's free vault USDC and
    /// borrow `borrow_amount` against it, gated by a still-valid
    /// proof from `submit_proof`. Borrowed USDC is transferred
    /// directly to the user's wallet (it leaves the vault/lending
    /// system — this models "unlock liquidity without selling").
    pub fn borrow(
        env: Env,
        user: Address,
        collateral_amount: i128,
        borrow_amount: i128,
    ) -> Result<(), LendingError> {
        if collateral_amount <= 0 || borrow_amount <= 0 {
            return Err(LendingError::InvalidAmount);
        }
        user.require_auth();

        Self::assert_proof_fresh(&env, &user)?;

        let ltv_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LiquidationLtvBps)
            .ok_or(LendingError::NotInitialized)?;
        let max_borrow = (collateral_amount * ltv_bps as i128) / 10_000i128;
        if borrow_amount > max_borrow {
            return Err(LendingError::ExceedsBorrowLimit);
        }

        let vault_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::VaultContract)
            .ok_or(LendingError::NotInitialized)?;
        let vault_client = vault_contract::Client::new(&env, &vault_id);

        // Lock collateral in the vault (vault requires the user's own
        // auth on this call — see vault::lock_collateral).
        match vault_client.try_lock_collateral(&user, &collateral_amount) {
            Ok(Ok(())) => {}
            _ => return Err(LendingError::InsufficientCollateral),
        }

        let debt_key = DataKey::Debt(user.clone());
        let current_debt: i128 = env.storage().persistent().get(&debt_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&debt_key, &(current_debt + borrow_amount));

        let collat_key = DataKey::CollateralLocked(user.clone());
        let current_collat: i128 = env.storage().persistent().get(&collat_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&collat_key, &(current_collat + collateral_amount));

        // Pay out borrowed USDC. Lending contract must itself hold a
        // USDC reserve (funded by admin / liquidity providers) to
        // disburse loans from — see contracts/README.md "funding the
        // lending pool" for the deposit_liquidity flow.
        let usdc: Address = Self::usdc_token(&env, &vault_id)?;
        token::Client::new(&env, &usdc).transfer(
            &env.current_contract_address(),
            &user,
            &borrow_amount,
        );

        env.events().publish(
            (Symbol::new(&env, "borrow"), user),
            (collateral_amount, borrow_amount),
        );
        Ok(())
    }

    /// Repay part or all of an outstanding debt, then proportionally
    /// unlock collateral back to the vault.
    pub fn repay(env: Env, user: Address, repay_amount: i128) -> Result<(), LendingError> {
        if repay_amount <= 0 {
            return Err(LendingError::InvalidAmount);
        }
        user.require_auth();

        let debt_key = DataKey::Debt(user.clone());
        let current_debt: i128 = env.storage().persistent().get(&debt_key).unwrap_or(0);
        if repay_amount > current_debt {
            return Err(LendingError::RepayExceedsDebt);
        }

        let vault_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::VaultContract)
            .ok_or(LendingError::NotInitialized)?;
        let usdc: Address = Self::usdc_token(&env, &vault_id)?;

        token::Client::new(&env, &usdc).transfer(
            &user,
            &env.current_contract_address(),
            &repay_amount,
        );

        let new_debt = current_debt - repay_amount;
        env.storage().persistent().set(&debt_key, &new_debt);

        // Unlock collateral proportional to the fraction repaid.
        let collat_key = DataKey::CollateralLocked(user.clone());
        let current_collat: i128 = env.storage().persistent().get(&collat_key).unwrap_or(0);
        if current_debt > 0 {
            let unlock_amount = (current_collat * repay_amount) / current_debt;
            let vault_client = vault_contract::Client::new(&env, &vault_id);
            let _ = vault_client.try_unlock_collateral(&user, &unlock_amount);
            env.storage()
                .persistent()
                .set(&collat_key, &(current_collat - unlock_amount));
        }

        env.events()
            .publish((Symbol::new(&env, "repay"), user), repay_amount);
        Ok(())
    }

    pub fn get_position(env: Env, user: Address) -> (i128, i128) {
        let debt: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Debt(user.clone()))
            .unwrap_or(0);
        let collateral: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::CollateralLocked(user))
            .unwrap_or(0);
        (debt, collateral)
    }

    /// Health factor = (collateral * liquidation_ltv) / debt, scaled
    /// 1e6. A value below 1e6 means the position is liquidatable.
    /// Returns i128::MAX-equivalent sentinel (no debt = infinitely healthy)
    /// represented here as -1 for the frontend to render as "∞".
    pub fn health_factor(env: Env, user: Address) -> Result<i128, LendingError> {
        let (debt, collateral) = Self::get_position(env.clone(), user);
        if debt == 0 {
            return Ok(-1);
        }
        let ltv_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LiquidationLtvBps)
            .ok_or(LendingError::NotInitialized)?;
        let max_safe_debt = (collateral * ltv_bps as i128) / 10_000i128;
        Ok((max_safe_debt * 1_000_000i128) / debt)
    }

    // --- internal helpers ---

    fn assert_proof_fresh(env: &Env, user: &Address) -> Result<(), LendingError> {
        let verified_at: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProofVerifiedAt(user.clone()))
            .ok_or(LendingError::NoValidProof)?;
        let validity: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ProofValiditySecs)
            .unwrap_or(3600);
        if env.ledger().timestamp().saturating_sub(verified_at) > validity {
            return Err(LendingError::NoValidProof);
        }
        Ok(())
    }

    fn usdc_token(env: &Env, vault_id: &Address) -> Result<Address, LendingError> {
        let client = vault_contract::Client::new(env, vault_id);
        match client.try_get_usdc_token() {
            Ok(Ok(addr)) => Ok(addr),
            _ => Err(LendingError::NotInitialized),
        }
    }
}

mod test;
