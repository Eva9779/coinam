'use server';
/**
 * @fileOverview Antigravity Equity Agent.
 * Specialized in Tokenized Real World Asset (RWA) settlement with Guardian auto-harvest.
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
 * Local RWA Quantitative Engine
 */
function getLocalRWAStrategy(input: StockBotInput): StockBotOutput {
  const actions: any[] = [];
  
  if (input.isGuardianMode) {
    input.currentHoldings.forEach(hold => {
      const market = input.marketData.find(m => m.symbol === hold.symbol || hold.symbol.includes(m.symbol));
      if (market && market.changePercent > 1.5 && hold.value >= 20) {
        actions.push({
          type: 'sell',
          asset: hold.symbol,
          amount: hold.shares,
          reasoning: `GUARDIAN: Equity surge detected (${market.changePercent}%). Harvesting $${hold.value} yield.`
        });
      }
    });
  } else {
    // Basic Entry Logic
    if (input.riskTolerance === 'high') {
      const apple = input.marketData.find(m => m.symbol === 'AAPL');
      if (apple && !input.currentHoldings.some(h => h.symbol.includes('AAPL'))) {
        actions.push({ type: 'buy', asset: 'NASDAQ:AAPL', amount: 0.05, reasoning: 'Initial $10 tech unit acquisition.' });
      }
    }
  }

  return {
    summary: input.isGuardianMode ? 'GUARDIAN RWA HARVEST ACTIVE' : 'RWA MICRO-UNIT SETTLEMENT',
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'Awaiting strategic equity surge.' }],
    sentiment: 'neutral',
    error: `Local Guardian active.`
  };
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: StockBotOutputSchema },
      prompt: `You are an institutional RWA Strategy Agent. 
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      Directives: If Guardian Mode is ACTIVE, automatically sell any stock asset (AAPL, TSLA, BND) that has increased in price to lock in profits, even if the user only has $20. 
      BE FEE-AWARE: Do not suggest trades where the $5-$10 gas fee destroys the profit. Target $10 trade units for a $50 budget.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
