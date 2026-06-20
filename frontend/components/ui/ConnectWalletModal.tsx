"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Wallet, ArrowRight, CheckCircle, Zap, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "connect" | "email" | "check-email" | "wallet" | "success";

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const [step, setStep] = useState<Step>("connect");
  const [email, setEmail] = useState("");
  const { address, isConnecting, error, freighterAvailable, connect } = useWalletContext();

  // Move to the success step automatically once Freighter actually
  // reports a connected address (real state, not a fake timer).
  useEffect(() => {
    if (address && (step === "wallet" || step === "connect")) {
      setStep("success");
    }
  }, [address, step]);

  const handleClose = () => {
    onClose();
    setTimeout(() => setStep(address ? "success" : "connect"), 300);
  };

  const handleFreighterConnect = async () => {
    setStep("wallet");
    await connect();
    // useEffect above advances to "success" once `address` updates;
    // if connect() fails, `error` is shown inline on the wallet step.
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[var(--foreground)]/30 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[var(--foreground)] rounded-sm flex items-center justify-center">
                    <Zap size={12} className="text-[var(--background)] fill-current" />
                  </div>
                  <span id="modal-title" className="text-sm font-semibold" style={{ fontFamily: "var(--font-body)" }}>
                    {step === "connect" && "Connect to Ztocks"}
                    {step === "email" && "Enter your email"}
                    {step === "check-email" && "Check your email"}
                    {step === "wallet" && "Connect Wallet"}
                    {step === "success" && "You're all set!"}
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[var(--muted)] transition-colors cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* Step: Connect */}
                  {step === "connect" && (
                    <motion.div
                      key="connect"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">
                        Connect your Stellar wallet to access the app.
                      </p>
                      <button
                        onClick={handleFreighterConnect}
                        className="flex items-center gap-3 w-full h-11 px-4 border border-[var(--border)] rounded-sm hover:bg-[var(--muted)] transition-colors cursor-pointer text-sm font-medium"
                      >
                        <Wallet size={16} className="text-[var(--muted-foreground)]" />
                        Connect Freighter Wallet
                      </button>
                      <button
                        disabled
                        title="Email login is not yet implemented — Freighter is the live, working connection method."
                        className="flex items-center gap-3 w-full h-11 px-4 border border-[var(--border)] rounded-sm cursor-not-allowed text-sm font-medium opacity-40"
                      >
                        <Mail size={16} className="text-[var(--muted-foreground)]" />
                        Continue with Email
                        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                          Soon
                        </span>
                      </button>
                    </motion.div>
                  )}

                  {/* Step: Email (placeholder — not wired to a real backend) */}
                  {step === "email" && (
                    <motion.div
                      key="email"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">
                        We&apos;ll send you a magic link to sign in.
                      </p>
                      <input
                        type="email"
                        placeholder="sam@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-4 border border-[var(--border)] rounded-sm text-sm bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] transition-shadow font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => setStep("check-email")}
                        className="flex items-center justify-center gap-2 w-full h-11 bg-[var(--foreground)] text-[var(--background)] rounded-sm text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Continue
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => setStep("connect")}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer text-center"
                      >
                        ← Back
                      </button>
                    </motion.div>
                  )}

                  {/* Step: Check Email */}
                  {step === "check-email" && (
                    <motion.div
                      key="check-email"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center gap-4 py-4"
                    >
                      <div className="w-14 h-14 border border-[var(--border)] rounded-full flex items-center justify-center">
                        <Mail size={24} className="text-[var(--muted-foreground)]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">Magic link sent!</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Check{" "}
                          <span className="font-mono text-[var(--foreground)]">
                            {email || "your inbox"}
                          </span>{" "}
                          for a sign-in link.
                        </p>
                      </div>
                      <button
                        onClick={() => setStep("connect")}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      >
                        Resend email
                      </button>
                    </motion.div>
                  )}

                  {/* Step: Wallet — shows REAL Freighter connection state */}
                  {step === "wallet" && (
                    <motion.div
                      key="wallet"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-4 py-2"
                    >
                      {isConnecting && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <Loader2 size={28} className="animate-spin text-[var(--muted-foreground)]" />
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Approve the connection in the Freighter popup...
                          </p>
                        </div>
                      )}

                      {!isConnecting && freighterAvailable === false && (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                          <AlertCircle size={28} className="text-amber-500" />
                          <p className="text-sm font-medium">Freighter not detected</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Install the Freighter browser extension, then try again.
                          </p>
                          <a
                            href="https://www.freighter.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline text-[var(--foreground)]"
                          >
                            freighter.app
                          </a>
                        </div>
                      )}

                      {!isConnecting && error && freighterAvailable !== false && (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                          <AlertCircle size={28} className="text-red-500" />
                          <p className="text-sm font-medium">Connection failed</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{error}</p>
                          <button
                            onClick={handleFreighterConnect}
                            className="text-xs underline text-[var(--foreground)] cursor-pointer"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setStep("connect")}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer text-center"
                      >
                        ← Back
                      </button>
                    </motion.div>
                  )}

                  {/* Step: Success */}
                  {step === "success" && address && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center gap-4 py-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.1, damping: 16, stiffness: 260 }}
                        className="w-14 h-14 border border-[var(--border)] rounded-full flex items-center justify-center"
                      >
                        <CheckCircle size={28} className="text-emerald-500" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">Wallet connected!</p>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono">
                          {address.slice(0, 4)}...{address.slice(-4)}
                        </p>
                      </div>
                      <button
                        onClick={handleClose}
                        className="flex items-center justify-center gap-2 w-full h-11 bg-[var(--foreground)] text-[var(--background)] rounded-sm text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer mt-1"
                      >
                        Go to Dashboard
                        <ArrowRight size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Real wallet connection, powered by Freighter */}
              <div className="px-5 pb-4 flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-mono text-[var(--muted-foreground)]">Powered by</span>
                <span className="text-[10px] font-mono font-medium text-[var(--muted-foreground)]">Freighter</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
