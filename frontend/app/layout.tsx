import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";

export const metadata: Metadata = {
  title: "Ztocks — Private Tokenized Stock Investing on Stellar",
  description:
    "Buy synthetic tokenized stocks on Stellar while preserving portfolio privacy using Zero-Knowledge Proofs. AAPLx, TSLAx, NVDAx, GOOGLx.",
  keywords: [
    "Stellar",
    "synthetic stocks",
    "zero knowledge proofs",
    "DeFi",
    "tokenized equities",
    "Soroban",
    "ZK proofs",
    "private investing",
  ],
  openGraph: {
    title: "Ztocks — Private Tokenized Stock Investing on Stellar",
    description:
      "Buy synthetic tokenized stocks on Stellar while preserving portfolio privacy using Zero-Knowledge Proofs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
