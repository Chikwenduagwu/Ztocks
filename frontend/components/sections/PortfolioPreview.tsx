"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PORTFOLIO, PORTFOLIO_STATS, ZK_PROOFS } from "@/lib/mock-data";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Eye, EyeOff, ShieldCheck, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PortfolioPreviewProps {
  onConnect?: () => void;
}

export default function PortfolioPreview({ onConnect }: PortfolioPreviewProps) {
  const [hidden, setHidden] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [proofDone, setProofDone] = useState(false);

  const handleGenerateProof = () => {
    setGenerating(true);
    setProofDone(false);
    setTimeout(() => {
      setGenerating(false);
      setProofDone(true);
    }, 2200);
  };

  return (
    <section className="py-[var(--section-padding)] border-t border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
        >
          <div>
            <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
              Portfolio · Sample Data
            </p>
            <h2
              className="text-fluid-3xl text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Your holdings,
              <br />
              <em>completely private</em>
            </h2>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:opacity-70 transition-opacity cursor-pointer"
          >
            Open dashboard <ArrowRight size={14} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: stats */}
          <div className="flex flex-col gap-4">
            {/* Total value */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-[var(--muted-foreground)]">Portfolio Value</span>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="p-1 cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  aria-label={hidden ? "Show value" : "Hide value"}
                >
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <AnimatePresence mode="wait">
                {hidden ? (
                  <motion.div
                    key="hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-display text-[var(--foreground)] tracking-tight flex items-center gap-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <span className="blur-sm select-none">$24,780.45</span>
                    <span className="text-xs font-mono text-[var(--muted-foreground)] no-blur">••••</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="visible"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-display text-[var(--foreground)] tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatCurrency(PORTFOLIO_STATS.totalValue)}
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-xs font-mono text-emerald-600 mt-0.5">
                {formatPct(PORTFOLIO_STATS.totalPnlPct)} today
              </p>
            </motion.div>

            {/* Grid stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Synthetic Assets", value: "4", sub: "Active positions" },
                { label: "P&L", value: formatCurrency(PORTFOLIO_STATS.totalPnl), sub: "All-time" },
                { label: "Collateral Ratio", value: `${PORTFOLIO_STATS.collateralRatio}x`, sub: "Health factor" },
                { label: "Borrow Limit", value: formatCurrency(PORTFOLIO_STATS.borrowLimit), sub: "Available" },
              ].map((stat) => (
                <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{stat.label}</div>
                  <div className="text-base font-mono font-medium text-[var(--foreground)]">{stat.value}</div>
                  <div className="text-[10px] font-mono text-[var(--muted-foreground)]">{stat.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Middle: positions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">Holdings</span>
              <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{PORTFOLIO.length} positions</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {PORTFOLIO.map((pos) => (
                <div key={pos.symbol} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-sm bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                      <span className="text-[9px] font-mono font-medium">
                        {pos.symbol.replace("x", "").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[var(--foreground)]">{pos.symbol}</div>
                      <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {hidden ? "●●●●●" : `${pos.holdings.toFixed(2)} units`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-medium text-[var(--foreground)]">
                      {hidden ? "•••••" : formatCurrency(pos.value)}
                    </div>
                    <div className={`text-[10px] font-mono ${pos.pnlPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {formatPct(pos.pnlPct)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: ZK proof panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">ZK Proofs</span>
              <ShieldCheck size={14} className="text-[var(--muted-foreground)]" />
            </div>

            <div className="flex-1 p-5 flex flex-col gap-3">
              {ZK_PROOFS.map((proof, i) => (
                <motion.div
                  key={proof.label}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-start gap-3 p-3 rounded-sm border ${
                    proof.verified
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-[var(--border)] bg-[var(--muted)]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      proof.verified ? "bg-emerald-500" : "bg-[var(--border)]"
                    }`}
                  >
                    {proof.verified && <Check size={9} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--foreground)]">{proof.label}</div>
                    {proof.proofHash && (
                      <div className="text-[9px] font-mono text-[var(--muted-foreground)] truncate mt-0.5">
                        {proof.proofHash}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-5 border-t border-[var(--border)]">
              <button
                onClick={handleGenerateProof}
                disabled={generating}
                className="w-full h-10 flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating proof…
                  </>
                ) : proofDone ? (
                  <>
                    <Check size={14} />
                    Proof Generated (Demo)
                  </>
                ) : (
                  "Generate Proof (Demo)"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
