"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TickerBar from "@/components/ui/TickerBar";
import SetupBanner from "@/components/ui/SetupBanner";
import { formatCurrency } from "@/lib/utils";
import { SUPPORTED_ASSETS, ASSET_DISPLAY_NAMES } from "@/lib/stellar/config";
import { useWalletContext } from "@/contexts/WalletContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAssetPrices } from "@/hooks/useAssetPrices";
import { useLending } from "@/hooks/useLending";
import { useZkProof } from "@/hooks/useZkProof";
import { Eye, EyeOff, ShieldCheck, Check, Loader2, Copy, Wallet as WalletIcon } from "lucide-react";

export default function PortfolioPage() {
  const { address, connect } = useWalletContext();
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: portfolio, error: portfolioError } = usePortfolio(address);
  const { prices } = useAssetPrices();
  const { position: lendingPosition } = useLending(address);
  const { isProving, isSubmitting, error: zkError, proofVerified, generateAndSubmitProof } =
    useZkProof(address);

  const positions = useMemo(() => {
    if (!portfolio) return [];
    return SUPPORTED_ASSETS.map((symbol) => {
      const units = portfolio.holdings[symbol] ?? 0;
      const price = prices[symbol]?.price ?? null;
      const value = price != null ? units * price : null;
      return { symbol, name: ASSET_DISPLAY_NAMES[symbol], units, price, value };
    }).filter((p) => p.units > 0);
  }, [portfolio, prices]);

  const totalHoldingsValue = positions.reduce((sum, p) => sum + (p.value ?? 0), 0);

  const handleGenerateProof = async () => {
    if (!portfolio) return;
    // Builds the private witness from the CONNECTED WALLET's own
    // current holdings/prices — this data never leaves the browser
    // except as the resulting zero-knowledge proof. See useZkProof.ts
    // for why the byte-encoding step currently requires a small local
    // backend helper before this can fully succeed end-to-end.
    const holdings = SUPPORTED_ASSETS.map((s) => portfolio.holdings[s] ?? 0);
    const assetPrices = SUPPORTED_ASSETS.map((s) => prices[s]?.price ?? 0);
    await generateAndSubmitProof(
      {
        holdings,
        prices: assetPrices,
        salt: BigInt(Date.now()) * 1000000n + BigInt(Math.floor(Math.random() * 1000000)),
        ownerAddressAsInt: addressToFieldInt(address ?? ""),
      },
      10000, // threshold: portfolio value >= $10,000
      4 // minAssets: at least 4 distinct positions
    );
  };

  /** Reduces a Stellar address (G... base32 string) to a 128-bit
   * integer for the circuit's `ownerAddress` private input — see
   * circuits/portfolio_threshold.circom. Browser-safe (no Buffer). */
  function addressToFieldInt(addr: string): bigint {
    const bytes = new TextEncoder().encode(addr);
    let n = 0n;
    for (const b of bytes) {
      n = (n << 8n) | BigInt(b);
    }
    return n % 2n ** 128n;
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!address) {
    return (
      <>
        <Navbar onConnect={connect} />
        <TickerBar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="text-center">
            <WalletIcon size={32} className="mx-auto mb-4 text-[var(--muted-foreground)]" />
            <h1 className="text-xl font-medium mb-2">Connect your wallet</h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Connect Freighter to view your private portfolio.
            </p>
            <button
              onClick={connect}
              className="h-11 px-6 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar walletAddress={address} onConnect={connect} />
      <TickerBar />
      <main className="min-h-screen pt-16">
        <div className="max-w-[1440px] mx-auto px-[var(--container-padding)] py-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1
                className="text-fluid-2xl text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                Portfolio
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Your private synthetic stock positions on Stellar.
              </p>
            </div>
            <button
              onClick={() => setHidden(!hidden)}
              className="flex items-center gap-2 h-9 px-4 border border-[var(--border)] rounded-sm text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors cursor-pointer"
            >
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              {hidden ? "Show values" : "Hide values"}
            </button>
          </div>

          {portfolioError && <SetupBanner message={portfolioError} />}

          {/* Stats row — only real, on-chain-derived figures. No
              all-time P&L or avg-price shown since the vault contract
              doesn't track cost basis or history (see contracts/
              vault/src/lib.rs — it only stores current holdings). */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Free USDC",
                value: hidden ? "••••••" : formatCurrency(portfolio?.freeUsdc ?? 0),
                sub: "Available to trade",
              },
              {
                label: "Holdings Value",
                value: hidden ? "••••" : formatCurrency(totalHoldingsValue),
                sub: `${positions.length} position${positions.length === 1 ? "" : "s"}`,
              },
              {
                label: "Locked Collateral",
                value: hidden ? "••••••" : formatCurrency(portfolio?.lockedCollateral ?? 0),
                sub: "Backing active loans",
              },
              {
                label: "Health Factor",
                value:
                  lendingPosition?.healthFactor == null
                    ? "∞"
                    : `${lendingPosition.healthFactor.toFixed(2)}x`,
                sub: lendingPosition?.debt ? "Loan active" : "No debt",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4"
              >
                <div className="text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{stat.label}</div>
                <div className="text-xl font-mono font-medium text-[var(--foreground)]" style={{ letterSpacing: "-0.02em" }}>
                  {stat.value}
                </div>
                <div className="text-[10px] font-mono text-[var(--muted-foreground)] mt-0.5">{stat.sub}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Positions table */}
            <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                  Positions
                </span>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                  {positions.length} asset{positions.length === 1 ? "" : "s"}
                </span>
              </div>

              {positions.length === 0 ? (
                <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">
                  No positions yet. Head to{" "}
                  <a href="/trade" className="underline text-[var(--foreground)]">
                    Trade
                  </a>{" "}
                  to buy your first synthetic stock.
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {["Asset", "Holdings", "Price", "Value", "Allocation"].map((h) => (
                            <th
                              key={h}
                              className="text-left text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest px-5 py-3 first:pl-6 last:pr-6"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos, i) => (
                          <motion.tr
                            key={pos.symbol}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.06 }}
                            className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors"
                          >
                            <td className="px-5 py-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-sm bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                                  <span className="text-[9px] font-mono font-medium">
                                    {pos.symbol.replace("X", "").slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{pos.symbol}</div>
                                  <div className="text-[10px] font-mono text-[var(--muted-foreground)]">{pos.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono">{hidden ? "•••••" : pos.units.toFixed(4)}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono">
                                {pos.price != null ? formatCurrency(pos.price) : "—"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono font-medium">
                                {hidden ? "•••••" : pos.value != null ? formatCurrency(pos.value) : "—"}
                              </span>
                            </td>
                            <td className="px-5 py-4 pr-6">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--foreground)] rounded-full"
                                    style={{
                                      width: `${totalHoldingsValue > 0 && pos.value != null ? (pos.value / totalHoldingsValue) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                                  {totalHoldingsValue > 0 && pos.value != null
                                    ? `${((pos.value / totalHoldingsValue) * 100).toFixed(1)}%`
                                    : "—"}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-[var(--border)]">
                    {positions.map((pos) => (
                      <div key={pos.symbol} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-sm bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                            <span className="text-[10px] font-mono">{pos.symbol.replace("X", "").slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{pos.symbol}</div>
                            <div className="text-xs font-mono text-[var(--muted-foreground)]">
                              {hidden ? "•••••" : `${pos.units.toFixed(4)} units`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-medium">
                            {hidden ? "•••••" : pos.value != null ? formatCurrency(pos.value) : "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ZK Proof panel */}
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                    ZK Proof
                  </span>
                  <ShieldCheck size={14} className="text-[var(--muted-foreground)]" />
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    Generate a zero-knowledge proof that your portfolio is worth at least
                    $10,000 across 4+ assets — without revealing any individual holding.
                    Required before borrowing (see Lending).
                  </p>

                  {proofVerified === true && (
                    <div className="p-3 rounded-sm border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-2">
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-xs font-medium">Proof verified on-chain</span>
                    </div>
                  )}
                  {proofVerified === false && zkError && (
                    <div className="p-3 rounded-sm border border-red-500/20 bg-red-500/5">
                      <span className="text-xs font-mono text-red-500 break-words">{zkError}</span>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={handleGenerateProof}
                    disabled={isProving || isSubmitting || !portfolio}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isProving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Proving…
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Submitting…
                      </>
                    ) : proofVerified ? (
                      <>
                        <Check size={13} />
                        Generate New Proof
                      </>
                    ) : (
                      "Generate Proof"
                    )}
                  </button>
                </div>
              </div>

              {/* Allocation */}
              {positions.length > 0 && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5">
                  <div className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-4">
                    Allocation
                  </div>
                  <div className="space-y-2.5">
                    {positions.map((p) => {
                      const pct = totalHoldingsValue > 0 && p.value != null ? (p.value / totalHoldingsValue) * 100 : 0;
                      return (
                        <div key={p.symbol} className="flex items-center gap-3">
                          <div className="text-[10px] font-mono text-[var(--foreground)] w-14">{p.symbol}</div>
                          <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full bg-[var(--foreground)] rounded-full"
                            />
                          </div>
                          <div className="text-[10px] font-mono text-[var(--muted-foreground)] w-8 text-right">
                            {pct.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
