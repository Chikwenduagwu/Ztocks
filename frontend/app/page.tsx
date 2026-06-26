"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TickerBar from "@/components/ui/TickerBar";
import ConnectWalletModal from "@/components/ui/ConnectWalletModal";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import AssetsSection from "@/components/sections/AssetsSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PortfolioPreview from "@/components/sections/PortfolioPreview";
import LendingSection from "@/components/sections/LendingSection";
import CTASection from "@/components/sections/CTASection";
import { useWalletContext } from "@/contexts/WalletContext";

export default function HomePage() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { address } = useWalletContext();

  const handleConnect = () => setWalletModalOpen(true);

  return (
    <>
      <Navbar
        walletAddress={address}
        onConnect={handleConnect}
      />
      {/* <div className="pt-16">
  <TickerBar />
</div> */}

      <main>
        <HeroSection onConnect={handleConnect} />
        <FeaturesSection />
        <AssetsSection />
        <HowItWorksSection />
        <PortfolioPreview onConnect={handleConnect} />
        <LendingSection onConnect={handleConnect} />
        <CTASection onConnect={handleConnect} />
      </main>
      <Footer />
      <ConnectWalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  );
}
