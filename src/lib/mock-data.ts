
export const MOCK_WALLET_BALANCES = [
  { currency: 'BTC', amount: 0.45, fiatValueUSD: 28540.50 },
  { currency: 'ETH', amount: 5.2, fiatValueUSD: 12480.00 },
  { currency: 'SOL', amount: 150.0, fiatValueUSD: 14250.00 },
  { currency: 'USDC', amount: 5000.0, fiatValueUSD: 5000.00 },
];

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx_001',
    type: 'receive' as const,
    currency: 'BTC',
    amount: 0.05,
    fiatValueUSD: 3100.00,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    fromAddress: 'bc1qxy2kg3...',
    description: 'Payment for freelance services',
  },
  {
    id: 'tx_002',
    type: 'send' as const,
    currency: 'ETH',
    amount: 1.5,
    fiatValueUSD: 3600.00,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    toAddress: '0x71C765...',
    description: 'Transfer to Ledger',
  },
  {
    id: 'tx_003',
    type: 'receive' as const,
    currency: 'SOL',
    amount: 25.0,
    fiatValueUSD: 2375.00,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    fromAddress: 'GvT9...vXw',
    description: 'Staking rewards',
  },
  {
    id: 'tx_004',
    type: 'send' as const,
    currency: 'BTC',
    amount: 0.1,
    fiatValueUSD: 6300.00,
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    toAddress: 'bc1q9...xyz',
    description: 'Unusual high value test',
  }
];

export const MOCK_MARKET_DATA = [
  {
    currency: 'BTC',
    currentPriceUSD: 63423.50,
    dailyChangePercent: -2.4,
    weeklyChangePercent: 5.8,
    volume24hUSD: 35000000000,
  },
  {
    currency: 'ETH',
    currentPriceUSD: 2415.20,
    dailyChangePercent: 1.2,
    weeklyChangePercent: -3.5,
    volume24hUSD: 15000000000,
  },
  {
    currency: 'SOL',
    currentPriceUSD: 142.50,
    dailyChangePercent: 15.4,
    weeklyChangePercent: 22.1,
    volume24hUSD: 4500000000,
  },
];
