
'use server';
/**
 * @fileOverview Proactive Equity Agent.
 * Specialized in immediate profit harvesting for Tokenized RWA assets.
 * Targets Leveraged ETFs (TQQQ, SOXL) for maximum daily yield.
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
  
  input.currentHoldings.forEach(hold => {
    const market = input.marketData.find(m => m.symbol === hold.symbol || hold.symbol.includes(m.symbol));
    if (market && market.changePercent > 0) {
      const gainUSD = hold.value * (market.changePercent / 100);
      
      if (gainUSD > assumedGasFee) {
        actions.push({
          type: 'sell',
          asset: hold.symbol,
          amount: hold.shares,
          reasoning: `PROFIT HARVEST: ${hold.symbol} has surged high enough to cover fees. Liquidating to USDC to lock in the daily gain.`
        });
      }
    }
  });

  if (actions.length === 0 && !input.isGuardianMode) {
    const bestAggressive = input.marketData.find(m => m.symbol === 'SOXL' && m.changePercent < -2);
    if (bestAggressive && !input.currentHoldings.some(h => h.symbol.includes('SOXL'))) {
      actions.push({ type: 'buy', asset: 'NASDAQ:SOXL', amount: 0.5, reasoning: 'LEVERAGED ENTRY: Buying the SOXL dip to maximize the next tech rally payout.' });
    }
  }

  return {
    summary: 'EQUITY HARVESTER ACTIVE',
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'Awaiting market surge high enough to beat the $7 network fee.' }],
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
      prompt: `You are the Proactive Equity Guardian for Coin A,M.
      MISSION: Hunt for daily profit in TQQQ, SOXL, NVDA, and META.
      
      HARVESTING RULES:
      1. NO DELAY: If (Gain in USD - $7 Gas) > $0, SELL IMMEDIATELY.
      2. LEVERAGE FOCUS: TQQQ and SOXL move 3X faster. Prioritize these for big daily wins.
      3. SAFE LANDING: Always return the full value to the USDC Dollar Vault.
      4. SMALL WINS: $1 profit is a victory. $0.50 profit is a victory. Do not wait for huge percentages that might crash.
      5. FREQUENCY: Your job is to make small profits as many times a day as possible.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
