import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works — Ztocks",
  description: "Learn how Ztocks uses Circom ZK proofs and Stellar Soroban to enable private synthetic stock investing.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <div className="border-b border-[var(--border)] bg-[var(--muted)]">
          <div className="max-w-[1440px] mx-auto px-[var(--container-padding)] py-16 lg:py-24">
            <p className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
              Learn
            </p>
            <h1
              className="text-fluid-3xl text-[var(--foreground)] max-w-2xl"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              How Ztocks works
            </h1>
            <p className="text-base text-[var(--muted-foreground)] mt-4 max-w-lg leading-relaxed">
              A technical overview of privacy-preserving synthetic stock trading on Stellar using
              Circom circuits and Soroban smart contracts.
            </p>
          </div>
        </div>

        <HowItWorksSection />

        {/* Tech deep dive */}
        <section className="py-[var(--section-padding)] border-t border-[var(--border)]">
          <div className="max-w-[1440px] mx-auto px-[var(--container-padding)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  label: "ZK Circuits",
                  title: "Circom 2.0",
                  body: "Portfolio value proofs are generated client-side using Circom circuits. The prover holds secret inputs (holdings, prices) and outputs a Groth16 proof that verifies aggregate value without exposing individual positions.",
                  stack: ["Circom 2.0", "snarkjs", "Groth16", "BN254 curve"],
                },
                {
                  label: "Smart Contracts",
                  title: "Soroban",
                  body: "Groth16 proofs are verified on-chain inside a Soroban contract. The verifier contract checks proof validity and emits attestation events that the lending protocol reads to approve collateral.",
                  stack: ["Rust", "Soroban SDK", "Groth16 verifier", "Stellar mainnet"],
                },
                {
                  label: "Assets",
                  title: "Synthetic Tokens",
                  body: "AAPLx, TSLAx, NVDAx, and GOOGLx are Soroban contract tokens. Prices are sourced from a Reflector oracle on Stellar. Users deposit USDC to mint synthetic positions, which track real equity prices.",
                  stack: ["Soroban tokens", "Reflector oracle", "USDC", "Price feeds"],
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
                    {item.label}
                  </span>
                  <h3
                    className="text-xl text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed flex-1">{item.body}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.stack.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-mono text-[var(--muted-foreground)] border border-[var(--border)] px-2 py-0.5 rounded-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
