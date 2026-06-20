"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TickerBar from "@/components/ui/TickerBar";
import SetupBanner from "@/components/ui/SetupBanner";
import { formatCurrency } from "@/lib/utils";
import { useWalletContext } from "@/contexts/WalletContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useLending } from "@/hooks/useLending";
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet as WalletIcon,
} from "lucide-react";

const LIQUIDATION_LTV_PCT = 85; // matches lending.initialize's liquidation_ltv_bps (8500) — see contracts/README.md
const BORROW_APY_PCT = 4.25; // matches lending.initialize's borrow_apy_bps (425)

export default function LendingPage() {
  const { address, connect } = useWalletContext();
  const { data: portfolio } = usePortfolio(address);
  const { position, isSubmitting, error, isReady, borrow, repay } = useLending(address);

  const [tab, setTab] = useState<"borrow" | "repay">("borrow");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [done, setDone] = useState(false);

  const debt = position?.debt ?? 0;
  const collateral = position?.collateral ?? 0;
  const freeUsdc = portfolio?.freeUsdc ?? 0;
  const maxBorrowFromCollateral =
    collateralAmount && !isNaN(+collateralAmount)
      ? (+collateralAmount * LIQUIDATION_LTV_PCT) / 100
      : 0;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setDone(false), 3000);
      return () => clearTimeout(t);
    }
  }, [done]);

  const handleSubmit = async () => {
    if (!address) {
      await connect();
      return;
    }
    let ok = false;
    if (tab === "borrow") {
      if (!collateralAmount || !borrowAmount) return;
      ok = await borrow(+collateralAmount, +borrowAmount);
      if (ok) {
        setCollateralAmount("");
        setBorrowAmount("");
      }
    } else {
      if (!repayAmount) return;
      ok = await repay(+repayAmount);
      if (ok) setRepayAmount("");
    }
    if (ok) setDone(true);
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
              Connect Freighter to borrow against your collateral.
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
          <div className="mb-8">
            <h1
              className="text-fluid-2xl text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Lending
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Borrow USDC against synthetic stock collateral without revealing your holdings.
            </p>
          </div>

          {!isReady && error && <SetupBanner message={error} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Position overview */}
            <div className="flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                    Locked Collateral
                  </span>
                  <ShieldCheck size={14} className="text-emerald-600" />
                </div>
                <div
                  className="text-3xl text-[var(--foreground)] mb-1"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
                >
                  {formatCurrency(collateral)}
                </div>
                <p className="text-[10px] font-mono text-[var(--muted-foreground)]">
                  Locked USDC backing your active loan, if any
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5 space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[var(--muted-foreground)]">Health Factor</span>
                    <span
                      className={`text-base font-mono font-medium ${
                        position?.healthFactor == null || position.healthFactor > 1.2
                          ? "text-emerald-600"
                          : "text-amber-500"
                      }`}
                    >
                      {position?.healthFactor == null ? "∞" : `${position.healthFactor.toFixed(2)}x`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${
                          position?.healthFactor == null
                            ? 100
                            : Math.min((position.healthFactor / 3) * 100, 100)
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {[
                  { label: "Borrowed", value: formatCurrency(debt) },
                  { label: "Free USDC", value: formatCurrency(freeUsdc) },
                  { label: "Borrow APY", value: `${BORROW_APY_PCT}%` },
                  { label: "Liquidation LTV", value: `${LIQUIDATION_LTV_PCT}%` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between py-1.5 border-t border-[var(--border)] first:border-0 first:pt-0"
                  >
                    <span className="text-xs font-mono text-[var(--muted-foreground)]">{stat.label}</span>
                    <span className="text-xs font-mono font-medium text-[var(--foreground)]">{stat.value}</span>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="bg-[var(--foreground)] text-[var(--background)] rounded-lg p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">ZK Attestation Required</div>
                    <div className="text-[10px] font-mono opacity-50 leading-relaxed">
                      Generate a proof on the Portfolio page before borrowing — it must pass
                      on-chain verification within the last hour.
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: Borrow/Repay form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="flex border-b border-[var(--border)]">
                  {(["borrow", "repay"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setDone(false); }}
                      className={`flex-1 h-11 flex items-center justify-center gap-2 text-sm font-medium capitalize transition-colors cursor-pointer ${
                        tab === t
                          ? "bg-[var(--foreground)] text-[var(--background)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {t === "borrow" ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-5">
                  {tab === "borrow" ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-mono text-[var(--muted-foreground)]">
                            Collateral to lock (USDC)
                          </label>
                          <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                            Free: {formatCurrency(freeUsdc)}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={collateralAmount}
                          onChange={(e) => { setCollateralAmount(e.target.value); setDone(false); }}
                          placeholder="0.00"
                          min="0"
                          className="w-full h-12 px-4 bg-[var(--muted)] border border-[var(--border)] rounded-sm text-base font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--foreground)] transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-mono text-[var(--muted-foreground)]">
                            Amount to borrow (USDC)
                          </label>
                          <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                            Max: {formatCurrency(maxBorrowFromCollateral)} ({LIQUIDATION_LTV_PCT}% LTV)
                          </span>
                        </div>
                        <input
                          type="number"
                          value={borrowAmount}
                          onChange={(e) => { setBorrowAmount(e.target.value); setDone(false); }}
                          placeholder="0.00"
                          min="0"
                          className="w-full h-12 px-4 bg-[var(--muted)] border border-[var(--border)] rounded-sm text-base font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--foreground)] transition-colors"
                        />
                      </div>

                      {borrowAmount && +borrowAmount > maxBorrowFromCollateral && (
                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-sm p-3">
                          <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                            Exceeds {LIQUIDATION_LTV_PCT}% LTV for this collateral amount — increase
                            collateral or reduce the borrow amount.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-mono text-[var(--muted-foreground)]">
                          Amount to repay (USDC)
                        </label>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          Borrowed: {formatCurrency(debt)}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={repayAmount}
                        onChange={(e) => { setRepayAmount(e.target.value); setDone(false); }}
                        placeholder="0.00"
                        min="0"
                        className="w-full h-12 px-4 bg-[var(--muted)] border border-[var(--border)] rounded-sm text-base font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--foreground)] transition-colors"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="text-xs font-mono text-red-500 bg-red-500/5 border border-red-500/20 rounded-sm p-3 break-words">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      (tab === "borrow" ? !collateralAmount || !borrowAmount : !repayAmount)
                    }
                    className={`w-full h-11 flex items-center justify-center gap-2 text-sm font-medium rounded-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      done
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                    }`}
                  >
                    {isSubmitting ? (
                      <><Loader2 size={14} className="animate-spin" />Processing…</>
                    ) : done ? (
                      <><Check size={14} />Transaction Confirmed</>
                    ) : (
                      `${tab === "borrow" ? "Borrow" : "Repay"} USDC`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
