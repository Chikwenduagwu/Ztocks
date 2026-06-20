"use client";

import { motion } from "framer-motion";
import { HOW_IT_WORKS } from "@/lib/mock-data";
import { ArrowDownToLine, TrendingUp, Database, ShieldCheck, Banknote } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  ArrowDownToLine,
  TrendingUp,
  Database,
  ShieldCheck,
  Banknote,
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-[var(--section-padding)] border-t border-[var(--border)] bg-grid">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
            Process
          </p>
          <h2
            className="text-fluid-3xl text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            From deposit to
            <br />
            <em>private lending in 5 steps</em>
          </h2>
        </motion.div>

        {/* Steps — horizontal on desktop */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-8 left-[calc(10%+2rem)] right-[calc(10%+2rem)] h-px bg-[var(--border)]" aria-hidden="true" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = ICONS[step.icon];
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4"
                >
                  {/* Icon with step number */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-[var(--card)] border border-[var(--border)] rounded-lg flex items-center justify-center shadow-sm">
                      {Icon && <Icon size={22} className="text-[var(--foreground)]" />}
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--foreground)] text-[var(--background)] rounded-full text-[9px] font-mono font-medium flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                      Step {step.step}
                    </span>
                    <h3 className="text-base font-medium text-[var(--foreground)]" style={{ fontFamily: "var(--font-body)" }}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ZK Tech callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 lg:mt-20 bg-[var(--foreground)] text-[var(--background)] rounded-lg p-8 lg:p-10"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">ZK Stack</span>
              <h3
                className="text-fluid-xl"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "inherit" }}
              >
                Proofs generated off-chain,
                <br />
                verified on Soroban
              </h3>
              <p className="text-sm opacity-60 leading-relaxed">
                Ztocks uses Circom circuits to generate Groth16 proofs client-side. The Soroban verifier contract
                confirms proof validity on-chain without ever seeing raw portfolio data.
              </p>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              {["Circom 2.0", "Groth16 Proofs", "Soroban Verifier", "BLS12-381 Curves"].map((tech) => (
                <div key={tech} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-mono opacity-80">{tech}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
