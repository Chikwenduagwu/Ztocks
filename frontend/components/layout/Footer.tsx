import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-[1440px] mx-auto px-[var(--container-padding)] py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[var(--foreground)] rounded-sm flex items-center justify-center flex-shrink-0">
                <Zap size={12} className="text-[var(--background)] fill-current" />
              </div>
              <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-body)", letterSpacing: "-0.04em" }}>
                Ztocks
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] font-mono max-w-xs">
              Private tokenized investing on Stellar.<br />
              Built for the Stellar Hacks: Real-World ZK hackathon.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-6" aria-label="Footer navigation">
            {[
              { href: "https://developers.stellar.org", label: "Docs" },
              { href: "https://github.com", label: "GitHub" },
              { href: "#", label: "Privacy" },
              { href: "#", label: "Terms" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted-foreground)] font-mono">
            © {year} Ztocks. Hackathon project — not financial advice.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-[var(--muted-foreground)]">Stellar Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
