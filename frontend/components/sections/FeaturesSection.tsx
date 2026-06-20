"use client";

import { motion } from "framer-motion";
import { TrendingUp, EyeOff, ShieldCheck, Banknote } from "lucide-react";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Tokenized Stocks",
    description:
      "Buy synthetic Apple, Tesla, Nvidia, and Google stocks as Soroban contract tokens, settled instantly on Stellar.",
    tag: "AAPLx · TSLAx · NVDAx · GOOGLx",
  },
  {
    icon: EyeOff,
    title: "Private Portfolios",
    description:
      "Your holdings and allocations are never exposed on-chain. Portfolio balances stay encrypted at the wallet level.",
    tag: "Zero exposure",
  },
  {
    icon: ShieldCheck,
    title: "ZK Proofs",
    description:
      "Prove your portfolio value without revealing individual holdings. Proofs generated with Circom, verified on Soroban.",
    tag: "Circom · Soroban verifier",
  },
  {
    icon: Banknote,
    title: "Lending",
    description:
      "Use your ZK proof as collateral attestation and borrow USDC without liquidating synthetic positions.",
    tag: "Up to 85% LTV",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export default function FeaturesSection() {
  return (
    <section className="py-[var(--section-padding)] border-t border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 lg:mb-16"
        >
          <div>
            <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
              Platform
            </p>
            <h2
              className="text-fluid-3xl text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              Everything you need
              <br />
              <em>to invest privately</em>
            </h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs sm:text-right leading-relaxed">
            A complete institutional-grade stack for synthetic equity exposure, built on Stellar Soroban.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)]">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.1 }}
              viewport={{ once: true, margin: "-60px" }}
              className="bg-[var(--background)] p-6 lg:p-8 flex flex-col gap-4 hover:bg-[var(--muted)] transition-colors duration-200 group"
            >
              <div className="w-10 h-10 border border-[var(--border)] rounded-sm flex items-center justify-center group-hover:border-[var(--foreground)] transition-colors duration-200">
                <feature.icon size={18} className="text-[var(--foreground)]" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <h3
                  className="text-base font-medium text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
              <span className="text-[10px] font-mono text-[var(--muted-foreground)] border border-[var(--border)] px-2 py-0.5 rounded-sm self-start">
                {feature.tag}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
