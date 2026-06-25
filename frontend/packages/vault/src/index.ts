import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CB7F4OTYEZEQQQUY4XM72LG4BYVAIYAIM4HVL5DFQOF7FHYY4RCC4HVQ",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "UsdcToken", values: void} | {tag: "OracleContract", values: void} | {tag: "SupportedAssets", values: void} | {tag: "UsdcBalance", values: readonly [string]} | {tag: "Holdings", values: readonly [string, string]} | {tag: "LockedCollateral", values: readonly [string]};

export const VaultError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"InsufficientBalance"},
  4: {message:"InsufficientHoldings"},
  5: {message:"InvalidAmount"},
  6: {message:"UnknownAsset"},
  7: {message:"OraclePriceUnavailable"}
}

export interface Client {
  /**
   * Construct and simulate a buy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Buy `amount` units (scaled 1e6) of `asset` at the oracle's
   * current price, paid from the user's free USDC balance.
   */
  buy: ({user, asset, amount}: {user: string, asset: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a sell transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sell `amount` units of `asset` back at the oracle's current
   * price, crediting USDC to the user's free balance.
   */
  sell: ({user, asset, amount}: {user: string, asset: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit USDC into the vault. Requires the caller to have
   * already approved this contract (standard SEP-41 token flow);
   * the actual transfer is pulled via `token::Client::transfer`.
   */
  deposit: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw free (unlocked) USDC back to the user's wallet.
   */
  withdraw: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, usdc_token, oracle_contract, supported_assets}: {admin: string, usdc_token: string, oracle_contract: string, supported_assets: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_portfolio transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns (free_usdc_balance, locked_collateral, holdings_map).
   * Used by the frontend dashboard and by the ZK proof generator
   * to build the *private* witness inputs client-side — this read
   * is for the wallet owner's own UI, not for any other party.
   */
  get_portfolio: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128, Map<string, i128>]>>

  /**
   * Construct and simulate a get_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_usdc_token: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a lock_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Locks `amount` of the user's free USDC as collateral. Only the
   * registered lending contract may call this (enforced by the
   * lending contract requiring the user's own auth before it asks
   * the vault to lock anything — the vault trusts its caller's
   * contract identity isn't being spoofed because Soroban's
   * `require_auth` ties the original signature to this exact call
   * chain).
   */
  lock_collateral: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a portfolio_value transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Computes total portfolio value (USDC value of all synthetic
   * holdings + free USDC) at current oracle prices. Used by the
   * frontend to show a live dashboard number, and by lending.rs
   * (via cross-contract call) to size borrow limits.
   */
  portfolio_value: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a unlock_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unlock_collateral: ({user, amount}: {user: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJVXNkY1Rva2VuAAAAAAAAAAAAAAAAAAAOT3JhY2xlQ29udHJhY3QAAAAAAAAAAAAAAAAAD1N1cHBvcnRlZEFzc2V0cwAAAAABAAAAAAAAAAtVc2RjQmFsYW5jZQAAAAABAAAAEwAAAAEAAAAAAAAACEhvbGRpbmdzAAAAAgAAABMAAAARAAAAAQAAAAAAAAAQTG9ja2VkQ29sbGF0ZXJhbAAAAAEAAAAT",
        "AAAABAAAAAAAAAAAAAAAClZhdWx0RXJyb3IAAAAAAAcAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAQAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAAAwAAAAAAAAAUSW5zdWZmaWNpZW50SG9sZGluZ3MAAAAEAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAABQAAAAAAAAAMVW5rbm93bkFzc2V0AAAABgAAAAAAAAAWT3JhY2xlUHJpY2VVbmF2YWlsYWJsZQAAAAAABw==",
        "AAAAAAAAAHFCdXkgYGFtb3VudGAgdW5pdHMgKHNjYWxlZCAxZTYpIG9mIGBhc3NldGAgYXQgdGhlIG9yYWNsZSdzCmN1cnJlbnQgcHJpY2UsIHBhaWQgZnJvbSB0aGUgdXNlcidzIGZyZWUgVVNEQyBiYWxhbmNlLgAAAAAAAANidXkAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAAG1TZWxsIGBhbW91bnRgIHVuaXRzIG9mIGBhc3NldGAgYmFjayBhdCB0aGUgb3JhY2xlJ3MgY3VycmVudApwcmljZSwgY3JlZGl0aW5nIFVTREMgdG8gdGhlIHVzZXIncyBmcmVlIGJhbGFuY2UuAAAAAAAABHNlbGwAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "AAAAAAAAALJEZXBvc2l0IFVTREMgaW50byB0aGUgdmF1bHQuIFJlcXVpcmVzIHRoZSBjYWxsZXIgdG8gaGF2ZQphbHJlYWR5IGFwcHJvdmVkIHRoaXMgY29udHJhY3QgKHN0YW5kYXJkIFNFUC00MSB0b2tlbiBmbG93KTsKdGhlIGFjdHVhbCB0cmFuc2ZlciBpcyBwdWxsZWQgdmlhIGB0b2tlbjo6Q2xpZW50Ojp0cmFuc2ZlcmAuAAAAAAAHZGVwb3NpdAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAADhXaXRoZHJhdyBmcmVlICh1bmxvY2tlZCkgVVNEQyBiYWNrIHRvIHRoZSB1c2VyJ3Mgd2FsbGV0LgAAAAh3aXRoZHJhdwAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAp1c2RjX3Rva2VuAAAAAAATAAAAAAAAAA9vcmFjbGVfY29udHJhY3QAAAAAEwAAAAAAAAAQc3VwcG9ydGVkX2Fzc2V0cwAAA+oAAAARAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAAPVSZXR1cm5zIChmcmVlX3VzZGNfYmFsYW5jZSwgbG9ja2VkX2NvbGxhdGVyYWwsIGhvbGRpbmdzX21hcCkuClVzZWQgYnkgdGhlIGZyb250ZW5kIGRhc2hib2FyZCBhbmQgYnkgdGhlIFpLIHByb29mIGdlbmVyYXRvcgp0byBidWlsZCB0aGUgKnByaXZhdGUqIHdpdG5lc3MgaW5wdXRzIGNsaWVudC1zaWRlIOKAlCB0aGlzIHJlYWQKaXMgZm9yIHRoZSB3YWxsZXQgb3duZXIncyBvd24gVUksIG5vdCBmb3IgYW55IG90aGVyIHBhcnR5LgAAAAAAAA1nZXRfcG9ydGZvbGlvAAAAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD7QAAAAMAAAALAAAACwAAA+wAAAARAAAACw==",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZGNfdG9rZW4AAAAAAAAAAAABAAAD6QAAABMAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "AAAAAAAAAXJMb2NrcyBgYW1vdW50YCBvZiB0aGUgdXNlcidzIGZyZWUgVVNEQyBhcyBjb2xsYXRlcmFsLiBPbmx5IHRoZQpyZWdpc3RlcmVkIGxlbmRpbmcgY29udHJhY3QgbWF5IGNhbGwgdGhpcyAoZW5mb3JjZWQgYnkgdGhlCmxlbmRpbmcgY29udHJhY3QgcmVxdWlyaW5nIHRoZSB1c2VyJ3Mgb3duIGF1dGggYmVmb3JlIGl0IGFza3MKdGhlIHZhdWx0IHRvIGxvY2sgYW55dGhpbmcg4oCUIHRoZSB2YXVsdCB0cnVzdHMgaXRzIGNhbGxlcidzCmNvbnRyYWN0IGlkZW50aXR5IGlzbid0IGJlaW5nIHNwb29mZWQgYmVjYXVzZSBTb3JvYmFuJ3MKYHJlcXVpcmVfYXV0aGAgdGllcyB0aGUgb3JpZ2luYWwgc2lnbmF0dXJlIHRvIHRoaXMgZXhhY3QgY2FsbApjaGFpbikuAAAAAAAPbG9ja19jb2xsYXRlcmFsAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAAClZhdWx0RXJyb3IAAA==",
        "AAAAAAAAAORDb21wdXRlcyB0b3RhbCBwb3J0Zm9saW8gdmFsdWUgKFVTREMgdmFsdWUgb2YgYWxsIHN5bnRoZXRpYwpob2xkaW5ncyArIGZyZWUgVVNEQykgYXQgY3VycmVudCBvcmFjbGUgcHJpY2VzLiBVc2VkIGJ5IHRoZQpmcm9udGVuZCB0byBzaG93IGEgbGl2ZSBkYXNoYm9hcmQgbnVtYmVyLCBhbmQgYnkgbGVuZGluZy5ycwoodmlhIGNyb3NzLWNvbnRyYWN0IGNhbGwpIHRvIHNpemUgYm9ycm93IGxpbWl0cy4AAAAPcG9ydGZvbGlvX3ZhbHVlAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+kAAAALAAAH0AAAAApWYXVsdEVycm9yAAA=",
        "AAAAAAAAAAAAAAARdW5sb2NrX2NvbGxhdGVyYWwAAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAH0AAAAApWYXVsdEVycm9yAAA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    buy: this.txFromJSON<Result<void>>,
        sell: this.txFromJSON<Result<void>>,
        deposit: this.txFromJSON<Result<void>>,
        withdraw: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        get_portfolio: this.txFromJSON<readonly [i128, i128, Map<string, i128>]>,
        get_usdc_token: this.txFromJSON<Result<string>>,
        lock_collateral: this.txFromJSON<Result<void>>,
        portfolio_value: this.txFromJSON<Result<i128>>,
        unlock_collateral: this.txFromJSON<Result<void>>
  }
}