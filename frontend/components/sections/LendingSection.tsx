"use client";

import { motion } from "framer-motion";
import { LENDING_STATS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface LendingSectionProps {
  onConnect?: () => void;
}

export default function LendingSection({ onConnect }: LendingSectionProps) {
  const borrowed = LENDING_STATS.borrowed;
  const borrowLimit = LENDING_STATS.borrowLimit;
  const utilization = (borrowed / borrowLimit) * 100;

  return (
    <section className="py-[var(--section-padding)] border-t border-[var(--border)] bg-[var(--muted)]">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="flex flex-col gap-6"
          >
            <div>
              <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
                Lending · Sample Data
              </p>
              <h2
                className="text-fluid-3xl text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                Borrow without
                <br />
                <em>selling</em>
              </h2>
            </div>
            <p className="text-base text-[var(--muted-foreground)] max-w-md leading-relaxed">
              Use synthetic stock positions as collateral and unlock liquidity. Your ZK proof attests to
              portfolio value — no counterparty ever sees your holdings.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Borrow up to 85% of collateral value",
                "No liquidation under 2.0x health factor",
                "Repay anytime, no fixed terms",
                "Portfolio data stays private throughout",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground)] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/lending"
              className="inline-flex items-center gap-2 h-11 px-5 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2"
            >
              Open Lending <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Dashboard card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                  Lend / Borrow
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  Healthy
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 space-y-5">
              {/* Collateral */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Your Collateral</div>
                  <div
                    className="text-3xl font-display text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
                  >
                    {formatCurrency(LENDING_STATS.collateralValue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Health Factor</div>
                  <div className="text-2xl font-mono font-medium text-emerald-600">
                    {LENDING_STATS.healthFactor}
                  </div>
                </div>
              </div>

              {/* Utilization bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-[var(--muted-foreground)]">Borrowed</span>
                  <span className="text-xs font-mono text-[var(--foreground)]">
                    {formatCurrency(borrowed)} / {formatCurrency(borrowLimit)}
                  </span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${utilization}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full bg-[var(--foreground)] rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{utilization.toFixed(1)}% utilized</span>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {formatCurrency(borrowLimit - borrowed)} available
                  </span>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Borrow APY", value: `${LENDING_STATS.borrowApy}%` },
                  { label: "Liquidation LTV", value: `${LENDING_STATS.liquidationLtv}%` },
                  { label: "Borrow Limit", value: formatCurrency(LENDING_STATS.borrowLimit) },
                  { label: "Available", value: formatCurrency(LENDING_STATS.borrowLimit - borrowed) },
                ].map((m) => (
                  <div key={m.label} className="bg-[var(--muted)] rounded-sm p-3">
                    <div className="text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{m.label}</div>
                    <div className="text-sm font-mono font-medium text-[var(--foreground)]">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* ZK note */}
              <div className="flex items-start gap-2 bg-[var(--muted)] border border-[var(--border)] rounded-sm p-3">
                <AlertTriangle size={12} className="text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-[var(--muted-foreground)] leading-relaxed">
                  Collateral value is attested via ZK proof. Your individual holdings remain private to the lender.
                </p>
              </div>

              {/* CTA */}
              <Link
                href="/lending"
                className="w-full h-11 flex items-center justify-center bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                Borrow USDC
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
