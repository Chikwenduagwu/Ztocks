"use client";

import { SUPPORTED_ASSETS } from "@/lib/stellar/config";
import { useAssetPrices } from "@/hooks/useAssetPrices";
import { formatCurrency } from "@/lib/utils";

export default function TickerBar() {
  const { prices, isReady } = useAssetPrices();

  const items = [...SUPPORTED_ASSETS, ...SUPPORTED_ASSETS]; // duplicate for seamless loop

  return (
    <div className="border-b border-[var(--border)] bg-[var(--muted)] overflow-hidden py-2.5" aria-hidden="true">
      <div className="ticker-wrapper">
        <div className="ticker-content flex items-center gap-8 px-4">
          {items.map((symbol, i) => {
            const p = prices[symbol];
            return (
              <span key={`${symbol}-${i}`} className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono font-medium text-[var(--foreground)]">{symbol}</span>
                <span className="text-xs font-mono text-[var(--foreground)]">
                  {isReady && p?.price != null ? formatCurrency(p.price) : "—"}
                </span>
                <span className="text-[var(--border)]">·</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
