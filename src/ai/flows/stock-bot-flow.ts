'use server';
/**
 * @fileOverview Proactive Equity Harvester Agent.
 * Optimized for Spot Buy/Sell without leveraged loss risk.
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
});
export type StockBotInput = z.infer<typeof StockBotInputSchema>;

const StockBotActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  asset: z.string(),
  amount: z.number().describe('USD Value to buy or Shares to sell.'),
  reasoning: z.string(),
});

const StockBotOutputSchema = z.object({
  summary: z.string().describe('Equity protocol strategy summary.'),
  actions: z.array(StockBotActionSchema).describe('Spot buy/sell actions.'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
});
export type StockBotOutput = z.infer<typeof StockBotOutputSchema>;

const stockBotPrompt = ai.definePrompt({
  name: 'stockBotPrompt',
  input: { schema: StockBotInputSchema },
  output: { schema: StockBotOutputSchema },
  prompt: `You are the Proactive Equity Harvester for Coin A,M user {{{userId}}}.
      MISSION: Accumulate high-growth tech stocks and harvest profits automatically.
      
      HARVESTING PROTOCOL (NO-LOSS):
      1. BUY ON DIPS: Identify assets in MarketData that are neutral/bullish but have a slight daily dip.
      2. FRACTIONAL ACCUMULATION: Buy $5-$10 worth of assets to diversify small balances ($20-$25).
      3. PROFIT HARVEST: Only SELL if the current value is >2% higher than the entry price. 
      4. ZERO LOSS: Never sell at a loss. If the price is down, HOLD until the market recovers.
      
      TARGET ASSETS: NVDA, TQQQ, SOXL, META. 
      RISK: {{{riskTolerance}}}.`,
});

const stockBotFlow = ai.defineFlow(
  {
    name: 'stockBotFlow',
    inputSchema: StockBotInputSchema,
    outputSchema: StockBotOutputSchema,
  },
  async (input) => {
    const { output } = await stockBotPrompt(input);
    return output!;
  }
);

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  return stockBotFlow(input);
}
