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
        const breakEvenThreshold = (assumedGasFee / hold.value) * 100 + 0.5;
        
        if (market.changePercent > breakEvenThreshold && hold.value >= 20) {
          actions.push({
            type: 'sell',
            asset: hold.symbol,
            amount: hold.shares,
            reasoning: `PROACTIVE EQUITY HARVEST: ${hold.symbol} is up ${market.changePercent}%. Math confirms net profit after $7 gas fee. Locking in now.`
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
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'Awaiting profitable equity surge (Gain > Gas Fees).' }],
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
      YOUR MISSION: Sell tokenized stocks the MOMENT they show profit after gas fees.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      
      HARVESTING RULES:
      1. DYNAMIC TARGETS: Do not wait for a fixed high percentage. 
      2. FEE MATH: If an asset (AAPL, TSLA, BND) is UP, calculate: (Price Increase USD - $7 Gas Fee).
      3. ACTION: If the result is POSITIVE (> $0), SELL IMMEDIATELY.
      4. NO RISK: We take the small wins now to prevent losing the profit if the market dips later.
      5. Always protect the principal. If no net profit after fees is possible, return 'hold'.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
