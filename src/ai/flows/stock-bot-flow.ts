
'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Antigravity Equity Agent (Stocks & Bonds).
 *
 * - analyzeEquityMarket - A function that handles stock/bond analysis and suggestions.
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
});
export type StockBotInput = z.infer<typeof StockBotInputSchema>;

const StockBotActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  asset: z.string(),
  amount: z.number().describe('Number of shares or bond units.'),
  reasoning: z.string(),
});

const StockBotOutputSchema = z.object({
  summary: z.string().describe('Short market sentiment summary.'),
  actions: z.array(StockBotActionSchema).describe('List of recommended adjustments.'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
});
export type StockBotOutput = z.infer<typeof StockBotOutputSchema>;

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes('quota'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  return withRetry(() => stockBotFlow(input));
}

const stockBotPrompt = ai.definePrompt({
  name: 'stockBotPrompt',
  input: { schema: StockBotInputSchema },
  output: { schema: StockBotOutputSchema },
  prompt: `You are an institutional equity strategist for Google Antigravity. Your goal is stable growth and capital preservation in stocks and bonds.

Risk Profile: {{{riskTolerance}}}

Current Market Data:
{{#each marketData}}
- {{{symbol}}} ({{{name}}}): Price $ {{{price}}}, Change: {{{changePercent}}}% [{{{type}}}]
{{/each}}

User Holdings:
{{#if currentHoldings}}
{{#each currentHoldings}}
- {{{symbol}}}: {{{shares}}} units, Value $ {{{value}}}
{{/each}}
{{else}}
User currently has no equity exposure. Recommend initial positions based on risk profile.
{{/if}}

Instructions:
1. Identify high-alpha opportunities in global stocks and safety in bonds.
2. If Risk is 'low', prioritize government and corporate bonds with steady yields.
3. If Risk is 'high', prioritize growth-sector stocks (Technology, AI, Energy).
4. Provide clear reasoning for every buy or sell recommendation.

Output in valid JSON.`,
});

const stockBotFlow = ai.defineFlow(
  {
    name: 'stockBotFlow',
    inputSchema: StockBotInputSchema,
    outputSchema: StockBotOutputSchema,
  },
  async (input) => {
    const { output } = await stockBotPrompt(input);
    if (!output) throw new Error('AI failed to generate equity strategy.');
    return output;
  }
);
