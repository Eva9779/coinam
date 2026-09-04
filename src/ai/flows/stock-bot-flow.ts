'use server';
/**
 * @fileOverview Proactive Equity Agent.
 * Specialized in immediate profit harvesting for Tokenized RWA assets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EquityMarketEntrySchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  changePercent: z.number(),
  type: z.enum(['stock', 'bond']),
});

const StockBotInputSchema = z.object({
  userId: z.string(),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  currentHoldings: z.array(z.object({
    symbol: z.string(),
    shares: z.number(),
    value: z.number(),
  })),
  marketData: z.array(EquityMarketEntrySchema),
  allocationLimitUSD: z.number().optional(),
  isGuardianMode: z.boolean().optional().describe('Background profit harvest mode.'),
});
export type StockBotInput = z.infer<typeof StockBotInputSchema>;

const StockBotActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  asset: z.string(),
  amount: z.number().describe('Shares or bond units.'),
  reasoning: z.string(),
});

const StockBotOutputSchema = z.object({
  summary: z.string().describe('RWA protocol strategy summary.'),
  actions: z.array(StockBotActionSchema).describe('Recommended tokenized RWA rebalancing actions.'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  error: z.string().optional(),
});
export type StockBotOutput = z.infer<typeof StockBotOutputSchema>;

/**
 * Local RWA Proactive Engine
 */
function getLocalRWAStrategy(input: StockBotInput): StockBotOutput {
  const actions: any[] = [];
  const assumedGasFee = 7;
  
  if (input.isGuardianMode) {
    input.currentHoldings.forEach(hold => {
      const market = input.marketData.find(m => m.symbol === hold.symbol || hold.symbol.includes(m.symbol));
      if (market && market.changePercent > 0) {
        // Take any profit over fees + 0.1%
        const breakEvenThreshold = (assumedGasFee / hold.value) * 100 + 0.1;
        
        if (market.changePercent > breakEvenThreshold && hold.value >= 10) {
          actions.push({
            type: 'sell',
            asset: hold.symbol,
            amount: hold.shares,
            reasoning: `PROACTIVE EQUITY HARVEST: Net profit detected on ${hold.symbol}. Selling now to secure yield before potential daily close volatility.`
          });
        }
      }
    });
  } else {
    // Buy logic for growth
    const apple = input.marketData.find(m => m.symbol === 'AAPL');
    if (apple && apple.changePercent < -1 && !input.currentHoldings.some(h => h.symbol.includes('AAPL'))) {
      actions.push({ type: 'buy', asset: 'NASDAQ:AAPL', amount: 0.1, reasoning: 'DIP ENTRY: Buying Apple token at discount to prepare for profit harvest.' });
    }
  }

  return {
    summary: input.isGuardianMode ? 'ACTIVE EQUITY HARVESTER' : 'GROWTH MODE',
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'Awaiting any profitable equity surge (Gain > Gas Fees).' }],
    sentiment: 'neutral',
    error: `Local Enclave Active.`
  };
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: StockBotOutputSchema },
      prompt: `You are the Proactive 24-Hour Equity Guardian for Coin A,M.
      YOUR MISSION: Sell tokenized stocks the MOMENT they show even a tiny profit after the $7 gas fee.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      
      HARVESTING RULES:
      1. ZERO WAIT TIME: If an asset (AAPL, TSLA, BND) is UP, and that Increase in USD covers the $7 Gas Fee, SELL IMMEDIATELY.
      2. NEVER MISS A PEAK: Do not wait for higher percentages. A bird in the hand is worth two in the bush. 
      3. ACTION: If (Price Increase - $7) > $0, SELL. 
      4. SMALL WINS: It is your duty to capture $1 profits multiple times rather than waiting for a $20 profit that might reverse into a loss.
      5. Always protect the principal. If no net profit after fees is possible, return 'hold'.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
