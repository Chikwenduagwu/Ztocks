"use client";

import { motion } from "framer-motion";
import { SUPPORTED_ASSETS, ASSET_DISPLAY_NAMES } from "@/lib/stellar/config";
import { useAssetPrices } from "@/hooks/useAssetPrices";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function timeAgo(unixSeconds: number | null): string {
  if (unixSeconds == null) return "no data yet";
  const mins = Math.max(0, Math.round((Date.now() / 1000 - unixSeconds) / 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function AssetsSection() {
  const { prices, isReady, error } = useAssetPrices();

  return (
    <section className="py-[var(--section-padding)] border-t border-[var(--border)] bg-[var(--muted)]">
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
              Supported Assets
            </p>
            <h2
              className="text-fluid-3xl text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Synthetic equities
              <br />
              <em>on Stellar</em>
            </h2>
          </div>
          <Link
            href="/trade"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:opacity-70 transition-opacity cursor-pointer"
          >
            Trade now <ArrowRight size={14} />
          </Link>
        </motion.div>

        {!isReady && error && (
          <p className="text-xs font-mono text-[var(--muted-foreground)] mb-6">{error}</p>
        )}

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Asset", "Price", "Last Updated", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest px-5 py-3 first:pl-6 last:pr-6 last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUPPORTED_ASSETS.map((symbol, i) => {
                  const p = prices[symbol];
                  return (
                    <motion.tr
                      key={symbol}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors group"
                    >
                      <td className="px-5 py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-sm bg-[var(--muted)] flex items-center justify-center flex-shrink-0 border border-[var(--border)]">
                            <span className="text-[10px] font-mono font-medium">
                              {symbol.replace("X", "").slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--foreground)]">{symbol}</div>
                            <div className="text-xs font-mono text-[var(--muted-foreground)]">
                              {ASSET_DISPLAY_NAMES[symbol]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                          {p?.price != null ? formatCurrency(p.price) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-[var(--muted-foreground)]">
                          {timeAgo(p?.updatedAt ?? null)}
                        </span>
                      </td>
                      <td className="px-5 py-4 pr-6 text-right">
                        <Link
                          href="/trade"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)] border border-[var(--border)] px-3 py-1.5 rounded-sm hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors cursor-pointer"
                        >
                          Buy
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {SUPPORTED_ASSETS.map((symbol, i) => {
            const p = prices[symbol];
            return (
              <motion.div
                key={symbol}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                      <span className="text-[10px] font-mono font-medium">
                        {symbol.replace("X", "").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{symbol}</div>
                      <div className="text-xs font-mono text-[var(--muted-foreground)]">
                        {ASSET_DISPLAY_NAMES[symbol]}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-mono font-medium">
                      {p?.price != null ? formatCurrency(p.price) : "—"}
                    </div>
                    <div className="text-xs font-mono text-[var(--muted-foreground)]">
                      {timeAgo(p?.updatedAt ?? null)}
                    </div>
                  </div>
                  <Link
                    href="/trade"
                    className="h-8 px-4 text-xs font-medium bg-[var(--foreground)] text-[var(--background)] rounded-sm hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center"
                  >
                    Buy
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
