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
    contractId: "CDODBA324UYHLANYPY7DYXOD74Q4FYGHG2ML3FL3FOKZLI6Z6PAXE7JE",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Pusher", values: void} | {tag: "Price", values: readonly [string]} | {tag: "SupportedAssets", values: void};


export interface PriceQuote {
  /**
 * Price scaled by 1e6 (matches the circuit's fixed-point convention).
 */
price: i128;
  /**
 * Ledger timestamp (unix seconds) when this quote was written.
 */
updated_at: u64;
}

export const OracleError = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"NotAuthorized"},
  4: {message:"UnknownAsset"},
  5: {message:"StalePrice"}
}

export interface Client {
  /**
   * Construct and simulate a get_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read the latest price for an asset. Callers (vault, lending)
   * should treat a quote older than their own staleness tolerance
   * as unusable — this contract just returns what it has plus the
   * timestamp, and leaves the staleness policy to the caller.
   */
  get_price: ({asset}: {asset: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<PriceQuote>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * One-time setup. `admin` can rotate the pusher key; `pusher` is
   * the address whose signature is required on every price update
   * (this is the off-chain script's Stellar keypair).
   */
  initialize: ({admin, pusher, supported_assets}: {admin: string, pusher: string, supported_assets: Array<string>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a push_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Push a fresh price for one asset. Only callable by the
   * registered pusher address. Called once per tick (e.g. every
   * 60s) by the off-chain price-pusher script for each of
   * AAPLx/TSLAx/NVDAx/GOOGLx.
   */
  push_price: ({asset, price}: {asset: string, price: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a push_prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Push prices for several assets in one transaction (cheaper for
   * the pusher than N separate calls each tick).
   */
  push_prices: ({assets, prices}: {assets: Array<string>, prices: Array<i128>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a rotate_pusher transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  rotate_pusher: ({new_pusher}: {new_pusher: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a supported_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  supported_assets: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<string>>>>

  /**
   * Construct and simulate a get_price_checked transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Convenience: get_price but reject if older than `max_age_secs`.
   */
  get_price_checked: ({asset, max_age_secs}: {asset: string, max_age_secs: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<PriceQuote>>>

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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAGUHVzaGVyAAAAAAABAAAAAAAAAAVQcmljZQAAAAAAAAEAAAARAAAAAAAAAAAAAAAPU3VwcG9ydGVkQXNzZXRzAA==",
        "AAAAAQAAAAAAAAAAAAAAClByaWNlUXVvdGUAAAAAAAIAAABDUHJpY2Ugc2NhbGVkIGJ5IDFlNiAobWF0Y2hlcyB0aGUgY2lyY3VpdCdzIGZpeGVkLXBvaW50IGNvbnZlbnRpb24pLgAAAAAFcHJpY2UAAAAAAAALAAAAPExlZGdlciB0aW1lc3RhbXAgKHVuaXggc2Vjb25kcykgd2hlbiB0aGlzIHF1b3RlIHdhcyB3cml0dGVuLgAAAAp1cGRhdGVkX2F0AAAAAAAG",
        "AAAABAAAAAAAAAAAAAAAC09yYWNsZUVycm9yAAAAAAUAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAABAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAADAAAAAAAAAAxVbmtub3duQXNzZXQAAAAEAAAAAAAAAApTdGFsZVByaWNlAAAAAAAF",
        "AAAAAAAAAPRSZWFkIHRoZSBsYXRlc3QgcHJpY2UgZm9yIGFuIGFzc2V0LiBDYWxsZXJzICh2YXVsdCwgbGVuZGluZykKc2hvdWxkIHRyZWF0IGEgcXVvdGUgb2xkZXIgdGhhbiB0aGVpciBvd24gc3RhbGVuZXNzIHRvbGVyYW5jZQphcyB1bnVzYWJsZSDigJQgdGhpcyBjb250cmFjdCBqdXN0IHJldHVybnMgd2hhdCBpdCBoYXMgcGx1cyB0aGUKdGltZXN0YW1wLCBhbmQgbGVhdmVzIHRoZSBzdGFsZW5lc3MgcG9saWN5IHRvIHRoZSBjYWxsZXIuAAAACWdldF9wcmljZQAAAAAAAAEAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAEAAAPpAAAH0AAAAApQcmljZVF1b3RlAAAAAAfQAAAAC09yYWNsZUVycm9yAA==",
        "AAAAAAAAAK5PbmUtdGltZSBzZXR1cC4gYGFkbWluYCBjYW4gcm90YXRlIHRoZSBwdXNoZXIga2V5OyBgcHVzaGVyYCBpcwp0aGUgYWRkcmVzcyB3aG9zZSBzaWduYXR1cmUgaXMgcmVxdWlyZWQgb24gZXZlcnkgcHJpY2UgdXBkYXRlCih0aGlzIGlzIHRoZSBvZmYtY2hhaW4gc2NyaXB0J3MgU3RlbGxhciBrZXlwYWlyKS4AAAAAAAppbml0aWFsaXplAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABnB1c2hlcgAAAAAAEwAAAAAAAAAQc3VwcG9ydGVkX2Fzc2V0cwAAA+oAAAARAAAAAQAAA+kAAAACAAAH0AAAAAtPcmFjbGVFcnJvcgA=",
        "AAAAAAAAAMJQdXNoIGEgZnJlc2ggcHJpY2UgZm9yIG9uZSBhc3NldC4gT25seSBjYWxsYWJsZSBieSB0aGUKcmVnaXN0ZXJlZCBwdXNoZXIgYWRkcmVzcy4gQ2FsbGVkIG9uY2UgcGVyIHRpY2sgKGUuZy4gZXZlcnkKNjBzKSBieSB0aGUgb2ZmLWNoYWluIHByaWNlLXB1c2hlciBzY3JpcHQgZm9yIGVhY2ggb2YKQUFQTHgvVFNMQXgvTlZEQXgvR09PR0x4LgAAAAAACnB1c2hfcHJpY2UAAAAAAAIAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAQAAA+kAAAACAAAH0AAAAAtPcmFjbGVFcnJvcgA=",
        "AAAAAAAAAGtQdXNoIHByaWNlcyBmb3Igc2V2ZXJhbCBhc3NldHMgaW4gb25lIHRyYW5zYWN0aW9uIChjaGVhcGVyIGZvcgp0aGUgcHVzaGVyIHRoYW4gTiBzZXBhcmF0ZSBjYWxscyBlYWNoIHRpY2spLgAAAAALcHVzaF9wcmljZXMAAAAAAgAAAAAAAAAGYXNzZXRzAAAAAAPqAAAAEQAAAAAAAAAGcHJpY2VzAAAAAAPqAAAACwAAAAEAAAPpAAAAAgAAB9AAAAALT3JhY2xlRXJyb3IA",
        "AAAAAAAAAAAAAAANcm90YXRlX3B1c2hlcgAAAAAAAAEAAAAAAAAACm5ld19wdXNoZXIAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAAC09yYWNsZUVycm9yAA==",
        "AAAAAAAAAAAAAAAQc3VwcG9ydGVkX2Fzc2V0cwAAAAAAAAABAAAD6QAAA+oAAAARAAAH0AAAAAtPcmFjbGVFcnJvcgA=",
        "AAAAAAAAAD9Db252ZW5pZW5jZTogZ2V0X3ByaWNlIGJ1dCByZWplY3QgaWYgb2xkZXIgdGhhbiBgbWF4X2FnZV9zZWNzYC4AAAAAEWdldF9wcmljZV9jaGVja2VkAAAAAAAAAgAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAAxtYXhfYWdlX3NlY3MAAAAGAAAAAQAAA+kAAAfQAAAAClByaWNlUXVvdGUAAAAAB9AAAAALT3JhY2xlRXJyb3IA" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_price: this.txFromJSON<Result<PriceQuote>>,
        initialize: this.txFromJSON<Result<void>>,
        push_price: this.txFromJSON<Result<void>>,
        push_prices: this.txFromJSON<Result<void>>,
        rotate_pusher: this.txFromJSON<Result<void>>,
        supported_assets: this.txFromJSON<Result<Array<string>>>,
        get_price_checked: this.txFromJSON<Result<PriceQuote>>
  }
}