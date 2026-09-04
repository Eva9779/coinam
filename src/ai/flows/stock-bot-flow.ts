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
    // Dynamic Equity Targets: Low = 2%, Med = 8%, High = 15-25%
    const threshold = input.riskTolerance === 'high' ? 15 : input.riskTolerance === 'medium' ? 8 : 2;

    input.currentHoldings.forEach(hold => {
      const market = input.marketData.find(m => m.symbol === hold.symbol || hold.symbol.includes(m.symbol));
      if (market && market.changePercent > threshold && hold.value >= 20) {
        actions.push({
          type: 'sell',
          asset: hold.symbol,
          amount: hold.shares,
          reasoning: `HIGH ALPHA EQUITY HARVEST: ${hold.symbol} surged ${market.changePercent}%. Locking in growth at institutional peak.`
        });
      }
    });
  } else {
    // Basic Entry Logic for growth
    if (input.riskTolerance === 'high' || input.riskTolerance === 'medium') {
      const apple = input.marketData.find(m => m.symbol === 'AAPL');
      if (apple && apple.changePercent < 0 && !input.currentHoldings.some(h => h.symbol.includes('AAPL'))) {
        actions.push({ type: 'buy', asset: 'NASDAQ:AAPL', amount: 0.06, reasoning: '24H OPPORTUNITY: Buying $10 tech unit on dip to grow balance.' });
      }
    }
  }

  return {
    summary: input.isGuardianMode ? 'AUTONOMOUS EQUITY GUARDIAN ACTIVE' : '24H RWA MONEY MACHINE',
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'GUARDING VAULT: Awaiting strategic equity dip/surge.' }],
    sentiment: 'neutral',
    error: `Local Money Machine active.`
  };
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: StockBotOutputSchema },
      prompt: `You are the 24-Hour Autonomous Equity Guardian for Coin A,M.
      YOUR MISSION: Constant monitoring of tokenized stocks to grow the user's money.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      RISK PROFILE: ${input.riskTolerance}.
      
      STRATEGY FOR HIGH ALPHA (15-25%): 
      1. TARGETS: If risk is 'high', hold for 15-25% growth. If 'medium', aim for 10%. If 'low', secure 5% profit.
      2. SELL any stock asset (AAPL, TSLA, BND) that hits these targets immediately to lock in profits.
      3. FEE PROTECTION: Only sell if the profit covers the $5-$10 gas fee. 
      4. Your priority is to ensure the user's money never sits idle during a market spike.
      5. Always protect the principal. If the market is flat, HOLD.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
