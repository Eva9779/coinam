
/**
 * Global Market Registry
 * Baseline for initial sync before live API data takes over.
 * Updated with high-volatility RWA assets for maximized daily yield.
 */
export const INITIAL_WALLET_BALANCES = [];

export const INITIAL_TRANSACTIONS = [];

export const INITIAL_MARKET_DATA = [
  {
    currency: 'BTC',
    currentPriceUSD: 64250.20,
    dailyChangePercent: 1.4,
    weeklyChangePercent: 4.2,
    volume24hUSD: 35000000000,
  },
  {
    currency: 'ETH',
    currentPriceUSD: 2450.75,
    dailyChangePercent: -0.8,
    weeklyChangePercent: 2.1,
    volume24hUSD: 15000000000,
  },
  {
    currency: 'BNB',
    currentPriceUSD: 580.40,
    dailyChangePercent: 8.2,
    weeklyChangePercent: 12.5,
    volume24hUSD: 2000000000,
  },
  {
    currency: 'SOL',
    currentPriceUSD: 145.30,
    dailyChangePercent: 5.2,
    weeklyChangePercent: 12.4,
    volume24hUSD: 4000000000,
  },
  {
    currency: 'USDC',
    currentPriceUSD: 1.00,
    dailyChangePercent: 0,
    weeklyChangePercent: 0,
    volume24hUSD: 500000000,
  },
  {
    currency: 'NVDA',
    currentPriceUSD: 725.10,
    dailyChangePercent: 4.8,
    weeklyChangePercent: 15.2,
    volume24hUSD: 45000000000,
  },
  {
    currency: 'SOXL',
    currentPriceUSD: 42.15,
    dailyChangePercent: 12.4,
    weeklyChangePercent: 28.5,
    volume24hUSD: 5000000000,
  },
  {
    currency: 'TQQQ',
    currentPriceUSD: 58.40,
    dailyChangePercent: 6.5,
    weeklyChangePercent: 18.2,
    volume24hUSD: 8000000000,
  }
];
