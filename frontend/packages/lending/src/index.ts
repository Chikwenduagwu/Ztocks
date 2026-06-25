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
    contractId: "CDM3SGASPH2CYWDPBVRLECYJFMQVJB3PE6MFQCE2L3BYZWQW3HMYKFWD",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "VaultContract", values: void} | {tag: "ZkVerifierContract", values: void} | {tag: "BorrowApyBps", values: void} | {tag: "LiquidationLtvBps", values: void} | {tag: "CollateralLocked", values: readonly [string]} | {tag: "Debt", values: readonly [string]} | {tag: "ProofVerifiedAt", values: readonly [string]} | {tag: "ProofValiditySecs", values: void};


export interface Groth16Proof {
  a: Buffer;
  b: Buffer;
  c: Buffer;
}

export const LendingError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"InvalidAmount"},
  4: {message:"NoValidProof"},
  5: {message:"ExceedsBorrowLimit"},
  6: {message:"InsufficientCollateral"},
  7: {message:"RepayExceedsDebt"}
}

export interface Client {
  /**
   * Construct and simulate a repay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay part or all of an outstanding debt, then proportionally
   * unlock collateral back to the vault.
   */
  repay: ({user, repay_amount}: {user: string, repay_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a borrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lock `collateral_amount` of the user's free vault USDC and
   * borrow `borrow_amount` against it, gated by a still-valid
   * proof from `submit_proof`. Borrowed USDC is transferred
   * directly to the user's wallet (it leaves the vault/lending
   * system — this models "unlock liquidity without selling").
   */
  borrow: ({user, collateral_amount, borrow_amount}: {user: string, collateral_amount: i128, borrow_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, vault_contract, zk_verifier_contract, borrow_apy_bps, liquidation_ltv_bps, proof_validity_secs}: {admin: string, vault_contract: string, zk_verifier_contract: string, borrow_apy_bps: u32, liquidation_ltv_bps: u32, proof_validity_secs: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_position: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128]>>

  /**
   * Construct and simulate a submit_proof transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submit a fresh ZK proof of solvency/diversification. Must be
   * called (and pass) before `borrow` — `borrow` checks
   * `ProofVerifiedAt` is within `ProofValiditySecs` of now.
   */
  submit_proof: ({user, proof, threshold, min_assets, owner_commit}: {user: string, proof: Groth16Proof, threshold: u256, min_assets: u256, owner_commit: u256}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a health_factor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Health factor = (collateral * liquidation_ltv) / debt, scaled
   * 1e6. A value below 1e6 means the position is liquidatable.
   * Returns i128::MAX-equivalent sentinel (no debt = infinitely healthy)
   * represented here as -1 for the frontend to render as "∞".
   */
  health_factor: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAANVmF1bHRDb250cmFjdAAAAAAAAAAAAAAAAAAAElprVmVyaWZpZXJDb250cmFjdAAAAAAAAAAAAAAAAAAMQm9ycm93QXB5QnBzAAAAAAAAAAAAAAARTGlxdWlkYXRpb25MdHZCcHMAAAAAAAABAAAAAAAAABBDb2xsYXRlcmFsTG9ja2VkAAAAAQAAABMAAAABAAAAAAAAAAREZWJ0AAAAAQAAABMAAAABAAAAAAAAAA9Qcm9vZlZlcmlmaWVkQXQAAAAAAQAAABMAAAAAAAAAAAAAABFQcm9vZlZhbGlkaXR5U2VjcwAAAA==",
        "AAAAAQAAAAAAAAAAAAAADEdyb3RoMTZQcm9vZgAAAAMAAAAAAAAAAWEAAAAAAAPuAAAAYAAAAAAAAAABYgAAAAAAA+4AAADAAAAAAAAAAAFjAAAAAAAD7gAAAGA=",
        "AAAABAAAAAAAAAAAAAAADExlbmRpbmdFcnJvcgAAAAcAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAQAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAADAAAAAAAAAAxOb1ZhbGlkUHJvb2YAAAAEAAAAAAAAABJFeGNlZWRzQm9ycm93TGltaXQAAAAAAAUAAAAAAAAAFkluc3VmZmljaWVudENvbGxhdGVyYWwAAAAAAAYAAAAAAAAAEFJlcGF5RXhjZWVkc0RlYnQAAAAH",
        "AAAAAAAAAGJSZXBheSBwYXJ0IG9yIGFsbCBvZiBhbiBvdXRzdGFuZGluZyBkZWJ0LCB0aGVuIHByb3BvcnRpb25hbGx5CnVubG9jayBjb2xsYXRlcmFsIGJhY2sgdG8gdGhlIHZhdWx0LgAAAAAABXJlcGF5AAAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAADHJlcGF5X2Ftb3VudAAAAAsAAAABAAAD6QAAAAIAAAfQAAAADExlbmRpbmdFcnJvcg==",
        "AAAAAAAAASNMb2NrIGBjb2xsYXRlcmFsX2Ftb3VudGAgb2YgdGhlIHVzZXIncyBmcmVlIHZhdWx0IFVTREMgYW5kCmJvcnJvdyBgYm9ycm93X2Ftb3VudGAgYWdhaW5zdCBpdCwgZ2F0ZWQgYnkgYSBzdGlsbC12YWxpZApwcm9vZiBmcm9tIGBzdWJtaXRfcHJvb2ZgLiBCb3Jyb3dlZCBVU0RDIGlzIHRyYW5zZmVycmVkCmRpcmVjdGx5IHRvIHRoZSB1c2VyJ3Mgd2FsbGV0IChpdCBsZWF2ZXMgdGhlIHZhdWx0L2xlbmRpbmcKc3lzdGVtIOKAlCB0aGlzIG1vZGVscyAidW5sb2NrIGxpcXVpZGl0eSB3aXRob3V0IHNlbGxpbmciKS4AAAAABmJvcnJvdwAAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAEWNvbGxhdGVyYWxfYW1vdW50AAAAAAAACwAAAAAAAAANYm9ycm93X2Ftb3VudAAAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAADExlbmRpbmdFcnJvcg==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA52YXVsdF9jb250cmFjdAAAAAAAEwAAAAAAAAAUemtfdmVyaWZpZXJfY29udHJhY3QAAAATAAAAAAAAAA5ib3Jyb3dfYXB5X2JwcwAAAAAABAAAAAAAAAATbGlxdWlkYXRpb25fbHR2X2JwcwAAAAAEAAAAAAAAABNwcm9vZl92YWxpZGl0eV9zZWNzAAAAAAYAAAABAAAD6QAAAAIAAAfQAAAADExlbmRpbmdFcnJvcg==",
        "AAAAAAAAAAAAAAAMZ2V0X3Bvc2l0aW9uAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD7QAAAAIAAAALAAAACw==",
        "AAAAAAAAAKpTdWJtaXQgYSBmcmVzaCBaSyBwcm9vZiBvZiBzb2x2ZW5jeS9kaXZlcnNpZmljYXRpb24uIE11c3QgYmUKY2FsbGVkIChhbmQgcGFzcykgYmVmb3JlIGBib3Jyb3dgIOKAlCBgYm9ycm93YCBjaGVja3MKYFByb29mVmVyaWZpZWRBdGAgaXMgd2l0aGluIGBQcm9vZlZhbGlkaXR5U2Vjc2Agb2Ygbm93LgAAAAAADHN1Ym1pdF9wcm9vZgAAAAUAAAAAAAAABHVzZXIAAAATAAAAAAAAAAVwcm9vZgAAAAAAB9AAAAAMR3JvdGgxNlByb29mAAAAAAAAAAl0aHJlc2hvbGQAAAAAAAAMAAAAAAAAAAptaW5fYXNzZXRzAAAAAAAMAAAAAAAAAAxvd25lcl9jb21taXQAAAAMAAAAAQAAA+kAAAABAAAH0AAAAAxMZW5kaW5nRXJyb3I=",
        "AAAAAAAAAPlIZWFsdGggZmFjdG9yID0gKGNvbGxhdGVyYWwgKiBsaXF1aWRhdGlvbl9sdHYpIC8gZGVidCwgc2NhbGVkCjFlNi4gQSB2YWx1ZSBiZWxvdyAxZTYgbWVhbnMgdGhlIHBvc2l0aW9uIGlzIGxpcXVpZGF0YWJsZS4KUmV0dXJucyBpMTI4OjpNQVgtZXF1aXZhbGVudCBzZW50aW5lbCAobm8gZGVidCA9IGluZmluaXRlbHkgaGVhbHRoeSkKcmVwcmVzZW50ZWQgaGVyZSBhcyAtMSBmb3IgdGhlIGZyb250ZW5kIHRvIHJlbmRlciBhcyAi4oieIi4AAAAAAAANaGVhbHRoX2ZhY3RvcgAAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+kAAAALAAAH0AAAAAxMZW5kaW5nRXJyb3I=" ]),
      options
    )
  }
  public readonly fromJSON = {
    repay: this.txFromJSON<Result<void>>,
        borrow: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        get_position: this.txFromJSON<readonly [i128, i128]>,
        submit_proof: this.txFromJSON<Result<boolean>>,
        health_factor: this.txFromJSON<Result<i128>>
  }
}