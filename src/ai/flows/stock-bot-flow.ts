
'use server';
/**
 * @fileOverview Proactive Equity Harvester Agent.
 * Optimized for Spot Buy/Sell with a focus on tech equities (NVDA, TQQQ, SOXL).
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
  model: 'googleai/gemini-2.0-flash',
  input: { schema: StockBotInputSchema },
  output: { schema: StockBotOutputSchema },
  prompt: `You are the Proactive Equity Harvester for Coin A,M.
      MISSION: Use budget {{{allocationLimitUSD}}} to accumulate tech stocks like NVDA, TQQQ, or SOXL.
      
      HARVESTING PROTOCOL (NO-LOSS SPOT TRADING):
      1. BUY ON DIPS: Identify tech assets that have dropped slightly (-1% to -3%) but are fundamentally strong.
      2. FRACTIONAL POSITION: Use small increments to build fractional shares.
      3. PROFIT HARVEST: Only SELL if the current price is at least 2.1% higher than the entry price. 
      4. ZERO LOSS HOLD: If the price drops after buying, DO NOT SELL. HOLD until the market recovers.
      
      CURRENT ALLOCATION: $ {{{allocationLimitUSD}}}
      RISK: {{{riskTolerance}}}`,
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
