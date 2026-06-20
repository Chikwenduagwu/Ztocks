"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

interface CTASectionProps {
  onConnect?: () => void;
}

export default function CTASection({ onConnect }: CTASectionProps) {
  return (
    <section className="py-[var(--section-padding)] border-t border-[var(--border)] bg-grid overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative bg-[var(--foreground)] text-[var(--background)] rounded-lg p-10 lg:p-16 overflow-hidden"
        >
          {/* Grid overlay inside card */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(249,249,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,249,247,0.3) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex flex-col gap-4 max-w-xl">
              <p className="text-xs font-mono opacity-40 uppercase tracking-widest">Stellar Hacks: Real-World ZK</p>
              <h2
                className="text-fluid-3xl"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                  color: "inherit",
                  lineHeight: 1.05,
                }}
              >
                Private synthetic investing,
                <br />
                <em>built on Stellar</em>
              </h2>
              <p className="text-base opacity-60 leading-relaxed">
                Start trading tokenized equities today. Generate your first ZK proof in minutes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 h-12 px-6 bg-[var(--background)] text-[var(--foreground)] text-sm font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--background)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foreground)]"
              >
                Launch App
                <ArrowRight size={15} />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-6 border border-white/20 text-[var(--background)] text-sm font-medium rounded-sm hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Github size={15} />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Hackathon badge */}
          <div className="relative mt-8 pt-8 border-t border-white/10 flex flex-wrap items-center gap-6">
            {[
              { label: "$10,000", sub: "Prize pool" },
              { label: "June 29", sub: "Submission deadline" },
              { label: "Soroban", sub: "Smart contracts" },
              { label: "Circom ZK", sub: "Privacy layer" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="text-base font-mono font-medium">{stat.label}</span>
                <span className="text-xs font-mono opacity-40">{stat.sub}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
