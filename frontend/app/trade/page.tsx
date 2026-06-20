"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TickerBar from "@/components/ui/TickerBar";
import SetupBanner from "@/components/ui/SetupBanner";
import MiniChart from "@/components/ui/MiniChart";
import { formatCurrency } from "@/lib/utils";
import { SUPPORTED_ASSETS, ASSET_DISPLAY_NAMES, AssetSymbol } from "@/lib/stellar/config";
import { useWalletContext } from "@/contexts/WalletContext";
import { useAssetPrices } from "@/hooks/useAssetPrices";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useTrade } from "@/hooks/useTrade";
import { ChevronDown, Info, Wallet as WalletIcon } from "lucide-react";

export default function TradePage() {
  const { address, connect } = useWalletContext();
  const { prices, error: priceError, isReady: pricesReady } = useAssetPrices();
  const { data: portfolio, refresh: refreshPortfolio } = usePortfolio(address);
  const { isSubmitting, error: tradeError, txHash, buy, sell } = useTrade(address);

  const [selectedSymbol, setSelectedSymbol] = useState<AssetSymbol>(SUPPORTED_ASSETS[0]);
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [justConfirmed, setJustConfirmed] = useState(false);

  const selectedPrice = prices[selectedSymbol]?.price ?? null;
  const usdcBalance = portfolio?.freeUsdc ?? 0;
  const holdingUnits = portfolio?.holdings[selectedSymbol] ?? 0;

  const estimatedUnits =
    amount && !isNaN(+amount) && selectedPrice ? +amount / selectedPrice : 0;

  useEffect(() => {
    if (txHash) {
      setJustConfirmed(true);
      setAmount("");
      refreshPortfolio();
      const t = setTimeout(() => setJustConfirmed(false), 4000);
      return () => clearTimeout(t);
    }
  }, [txHash, refreshPortfolio]);

  const handleOrder = async () => {
    if (!address) {
      await connect();
      return;
    }
    if (!amount || isNaN(+amount) || +amount <= 0) return;

    if (tab === "buy") {
      await buy(selectedSymbol, estimatedUnits);
    } else {
      await sell(selectedSymbol, +amount);
    }
  };

  const setupMessage = priceError ?? null;

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
              Trade
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Buy and sell synthetic tokenized equities on Stellar.
            </p>
          </div>

          {setupMessage && <SetupBanner message={setupMessage} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset list */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              {SUPPORTED_ASSETS.map((symbol) => {
                const p = prices[symbol];
                const positive = true; // 24h change not tracked on-chain yet — see roadmap note below
                return (
                  <motion.button
                    key={symbol}
                    onClick={() => {
                      setSelectedSymbol(symbol);
                      setJustConfirmed(false);
                    }}
                    whileHover={{ x: 2 }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedSymbol === symbol
                        ? "border-[var(--foreground)] bg-[var(--card)]"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--foreground)]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-sm bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
                          <span className="text-[9px] font-mono font-medium">
                            {symbol.replace("X", "").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[var(--foreground)]">{symbol}</div>
                          <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
                            {ASSET_DISPLAY_NAMES[symbol]}
                          </div>
                        </div>
                      </div>
                      {p?.price != null && (
                        <MiniChart data={[p.price, p.price]} positive={positive} />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                        {p?.price != null ? formatCurrency(p.price) : "—"}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {p?.updatedAt
                          ? `updated ${Math.max(0, Math.round((Date.now() / 1000 - p.updatedAt) / 60))}m ago`
                          : "no data"}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Trade panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Asset detail */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-medium text-[var(--foreground)] mb-1">{selectedSymbol}</h2>
                    <p className="text-xs font-mono text-[var(--muted-foreground)]">
                      {ASSET_DISPLAY_NAMES[selectedSymbol]}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-3xl text-[var(--foreground)]"
                      style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
                    >
                      {selectedPrice != null ? formatCurrency(selectedPrice) : "—"}
                    </div>
                    <div className="text-xs font-mono text-[var(--muted-foreground)]">
                      Your holdings: {holdingUnits.toFixed(4)} {selectedSymbol}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order form */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="flex border-b border-[var(--border)]">
                  {(["buy", "sell"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setAmount(""); }}
                      className={`flex-1 h-11 text-sm font-medium capitalize transition-colors cursor-pointer ${
                        tab === t
                          ? "bg-[var(--foreground)] text-[var(--background)]"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-[var(--muted-foreground)] mb-2">Asset</label>
                    <div className="flex items-center gap-3 h-11 px-4 bg-[var(--muted)] border border-[var(--border)] rounded-sm">
                      <div className="w-5 h-5 rounded-sm bg-[var(--border)] flex items-center justify-center">
                        <span className="text-[8px] font-mono">{selectedSymbol.replace("X", "").slice(0, 2)}</span>
                      </div>
                      <span className="text-sm font-medium flex-1">{selectedSymbol}</span>
                      <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[var(--muted-foreground)] mb-2">
                      Amount ({tab === "buy" ? "USDC" : selectedSymbol})
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setJustConfirmed(false); }}
                      placeholder="0.00"
                      min="0"
                      className="w-full h-11 px-4 bg-[var(--muted)] border border-[var(--border)] rounded-sm text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--foreground)] transition-colors"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        {tab === "buy" && estimatedUnits > 0
                          ? `≈ ${estimatedUnits.toFixed(4)} ${selectedSymbol}`
                          : ""}
                      </span>
                      <button
                        onClick={() =>
                          setAmount(String(tab === "buy" ? usdcBalance.toFixed(2) : holdingUnits.toFixed(4)))
                        }
                        className="text-[10px] font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        {tab === "buy"
                          ? `Balance: ${formatCurrency(usdcBalance)}`
                          : `Holdings: ${holdingUnits.toFixed(4)} ${selectedSymbol}`}
                      </button>
                    </div>
                  </div>

                  {(tradeError || priceError) && (
                    <div className="text-xs font-mono text-red-500 bg-red-500/5 border border-red-500/20 rounded-sm p-3">
                      {tradeError ?? priceError}
                    </div>
                  )}

                  <button
                    onClick={handleOrder}
                    disabled={
                      (!!address && (!amount || isNaN(+amount) || +amount <= 0)) ||
                      isSubmitting ||
                      !pricesReady
                    }
                    className={`w-full h-11 text-sm font-medium rounded-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      justConfirmed
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                    }`}
                  >
                    {!address ? (
                      <>
                        <WalletIcon size={14} /> Connect Wallet
                      </>
                    ) : isSubmitting ? (
                      "Processing…"
                    ) : justConfirmed ? (
                      "✓ Order Placed"
                    ) : (
                      `Review ${tab === "buy" ? "Buy" : "Sell"} Order`
                    )}
                  </button>

                  <div className="flex items-start gap-2 text-[10px] font-mono text-[var(--muted-foreground)]">
                    <Info size={11} className="flex-shrink-0 mt-0.5" />
                    Position is stored privately on Soroban. Prices reflect the last on-chain
                    oracle update, not a live ticker — see scripts/price-pusher for the feed.
                  </div>
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
