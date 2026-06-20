"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shield, TrendingUp, Lock } from "lucide-react";
import HeroChart from "./HeroChart";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

interface HeroSectionProps {
  onConnect?: () => void;
}

export default function HeroSection({ onConnect }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-100 pointer-events-none" />

      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(10,10,10,0.03)_0%,transparent_70%)] pointer-events-none dark:bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(249,249,247,0.04)_0%,transparent_70%)]" />

      <div className="relative max-w-[1440px] mx-auto px-[var(--container-padding)] w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[80vh] py-16 lg:py-24">

          {/* Left: Text */}
          <div className="flex flex-col gap-6 lg:gap-8 max-w-2xl">
            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0 }}
            >
              <div className="inline-flex items-center gap-2 border border-[var(--border)] rounded-sm px-3 py-1.5 bg-[var(--card)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-mono text-[var(--muted-foreground)] tracking-wide">
                  Private tokenized investing on Stellar
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            >
              <h1
                className="text-fluid-4xl text-[var(--foreground)] text-balance"
                style={{ fontFamily: "var(--font-display)", lineHeight: 1.02, letterSpacing: "-0.03em" }}
              >
                Invest in synthetic stocks
                <br />
                <span className="italic">without exposing</span>
                <br />
                your portfolio
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="text-fluid-base text-[var(--muted-foreground)] max-w-md leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Buy tokenized equities, generate privacy-preserving ZK proofs, and unlock lending
              without revealing your holdings.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 h-12 px-6 bg-[var(--foreground)] text-[var(--background)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Launch App
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex items-center gap-2 h-12 px-6 border border-[var(--border)] text-[var(--foreground)] text-sm font-medium rounded-sm hover:bg-[var(--muted)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Learn More
              </Link>
            </motion.div>

            {/* Trust micro-stats */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
              className="flex flex-wrap items-center gap-6 pt-4 border-t border-[var(--border)]"
            >
              {[
                { icon: Shield, label: "ZK Proofs", sub: "Circom on Soroban" },
                { icon: TrendingUp, label: "4 Synthetics", sub: "AAPL, TSLA, NVDA, GOOGL" },
                { icon: Lock, label: "Private", sub: "Holdings never exposed" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={14} className="text-[var(--muted-foreground)] flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-[var(--foreground)]">{label}</div>
                    <div className="text-[11px] font-mono text-[var(--muted-foreground)]">{sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero chart visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative hidden lg:block"
          >
            <HeroChart />
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
    </section>
  );
}
