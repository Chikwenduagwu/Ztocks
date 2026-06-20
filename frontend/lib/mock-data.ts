export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: string;
  volume: string;
  chartData: number[];
  color: string;
}

export const ASSETS: Asset[] = [
  {
    symbol: "AAPLx",
    name: "Apple Inc.",
    price: 213.57,
    change: 4.73,
    changePct: 2.26,
    marketCap: "$3.29T",
    volume: "$94.2M",
    chartData: [200, 205, 198, 210, 207, 212, 208, 215, 211, 213.57],
    color: "#0A0A0A",
  },
  {
    symbol: "TSLAx",
    name: "Tesla Inc.",
    price: 178.32,
    change: -3.15,
    changePct: -1.74,
    marketCap: "$568.4B",
    volume: "$62.1M",
    chartData: [190, 185, 188, 182, 186, 183, 179, 181, 176, 178.32],
    color: "#0A0A0A",
  },
  {
    symbol: "NVDAx",
    name: "Nvidia Corp.",
    price: 891.46,
    change: 18.34,
    changePct: 2.10,
    marketCap: "$2.19T",
    volume: "$211.8M",
    chartData: [840, 855, 848, 862, 870, 858, 875, 882, 888, 891.46],
    color: "#0A0A0A",
  },
  {
    symbol: "GOOGLx",
    name: "Alphabet Inc.",
    price: 175.84,
    change: 2.48,
    changePct: 1.43,
    marketCap: "$2.20T",
    volume: "$38.7M",
    chartData: [168, 170, 169, 172, 171, 174, 173, 175, 174, 175.84],
    color: "#0A0A0A",
  },
];

export interface PortfolioPosition {
  symbol: string;
  name: string;
  holdings: number;
  value: number;
  pnl: number;
  pnlPct: number;
  avgPrice: number;
}

export const PORTFOLIO: PortfolioPosition[] = [
  { symbol: "AAPLx", name: "Apple Inc.", holdings: 41.23, value: 8732.21, pnl: 612.40, pnlPct: 7.54, avgPrice: 198.45 },
  { symbol: "TSLAx", name: "Tesla Inc.", holdings: 34.10, value: 6125.40, pnl: -287.20, pnlPct: -4.48, avgPrice: 186.62 },
  { symbol: "NVDAx", name: "Nvidia Corp.", holdings: 6.31, value: 5621.33, pnl: 431.90, pnlPct: 8.32, avgPrice: 823.01 },
  { symbol: "GOOGLx", name: "Alphabet Inc.", holdings: 24.50, value: 4301.51, pnl: 198.50, pnlPct: 4.84, avgPrice: 167.78 },
];

export const PORTFOLIO_STATS = {
  totalValue: 24780.45,
  totalPnl: 955.60,
  totalPnlPct: 4.01,
  collateralRatio: 2.35,
  borrowLimit: 11070.19,
  availableLiquidity: 8200.00,
};

export const ZK_PROOFS = [
  { label: "Portfolio > $10,000", verified: true, proofHash: "0xZK_a4f9...3c21" },
  { label: "Diversified Holdings (4+ assets)", verified: true, proofHash: "0xZK_b8e1...7d44" },
  { label: "Eligible For Lending", verified: true, proofHash: "0xZK_c2f3...9a17" },
  { label: "KYC Compliance", verified: false, proofHash: null },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Deposit USDC",
    description: "Connect your Stellar wallet and deposit USDC as your base capital for synthetic stock purchases.",
    icon: "ArrowDownToLine",
  },
  {
    step: "02",
    title: "Buy Synthetic Stocks",
    description: "Purchase tokenized equities (AAPLx, TSLAx, NVDAx, GOOGLx) with instant on-chain settlement.",
    icon: "TrendingUp",
  },
  {
    step: "03",
    title: "Portfolio on Stellar",
    description: "Your positions are stored in a Soroban smart contract. No centralized custody, full self-sovereignty.",
    icon: "Database",
  },
  {
    step: "04",
    title: "Generate ZK Proof",
    description: "Produce a zero-knowledge proof of your portfolio value without ever revealing your individual holdings.",
    icon: "ShieldCheck",
  },
  {
    step: "05",
    title: "Unlock Lending",
    description: "Use your ZK proof as collateral attestation to borrow USDC without liquidating your positions.",
    icon: "Banknote",
  },
];

export const LENDING_STATS = {
  collateralValue: 18450.33,
  healthFactor: 2.35,
  borrowLimit: 11070.19,
  borrowed: 2850.00,
  borrowApy: 4.25,
  liquidationLtv: 85,
};
