"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency, formatPct } from "@/lib/utils";
import { ASSETS } from "@/lib/mock-data";

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeroChart() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-lg ml-auto">
      {/* Main portfolio card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest">Total Portfolio Value</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-sm">
            <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
            LIVE
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-display text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
            $24,780.45
          </span>
        </div>
        <p className="text-xs font-mono text-emerald-600">+$955.60 (4.01%) today</p>

        {/* Chart area placeholder */}
        <div className="mt-4 h-20 relative overflow-hidden rounded-sm bg-[var(--muted)]">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,65 L40,58 L80,62 L120,45 L160,50 L200,38 L240,42 L280,30 L320,25 L360,18 L400,15"
              fill="url(#heroGrad)"
              stroke="none"
              className="text-[var(--foreground)]"
            />
            <path
              d="M0,65 L40,58 L80,62 L120,45 L160,50 L200,38 L240,42 L280,30 L320,25 L360,18 L400,15"
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Holdings */}
        <div className="mt-4 space-y-2">
          {ASSETS.map((asset, i) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-sm bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-mono font-medium text-[var(--foreground)]">
                    {asset.symbol.replace("x", "").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--foreground)]">{asset.symbol}</div>
                  <div className="text-[10px] font-mono text-[var(--muted-foreground)]">{asset.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MiniSparkline data={asset.chartData} positive={asset.changePct >= 0} />
                <div className="text-right">
                  <div className="text-xs font-mono font-medium text-[var(--foreground)]">
                    {formatCurrency(asset.price)}
                  </div>
                  <div
                    className={`text-[10px] font-mono ${asset.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {formatPct(asset.changePct)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating ZK proof badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute -bottom-4 -left-6 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 shadow-md"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 5L4 7L8 3" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-mono font-medium text-[var(--foreground)]">ZK Proof Verified</div>
            <div className="text-[9px] font-mono text-[var(--muted-foreground)]">Portfolio ≥ $10,000</div>
          </div>
        </div>
      </motion.div>

      {/* Floating private badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.1 }}
        className="absolute -top-4 -right-4 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-3 py-2 shadow-md"
        style={{ zIndex: 10 }}
      >
        <div className="text-[10px] font-mono font-medium">Holdings Private</div>
        <div className="text-[9px] font-mono opacity-60">Circom · Soroban</div>
      </motion.div>
    </div>
  );
}
