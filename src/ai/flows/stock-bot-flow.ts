'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Antigravity Equity Agent.
 * Specialized in Stocks and Bonds rebalancing for long-term capital appreciation.
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
  amount: z.number().describe('Shares or bond units.'),
  reasoning: z.string(),
});

const StockBotOutputSchema = z.object({
  summary: z.string().describe('Market-wide strategy summary.'),
  actions: z.array(StockBotActionSchema).describe('Recommended rebalancing actions.'),
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
  prompt: `You are an institutional Portfolio Manager at Google Antigravity. Your goal is smart capital allocation across Stocks and Bonds.

Risk Profile: {{{riskTolerance}}}

Live Market Feed:
{{#each marketData}}
- {{{symbol}}} ({{{name}}}): $ {{{price}}} ({{{changePercent}}}% Change) [{{{type}}}]
{{/each}}

Portfolio Snapshot:
{{#if currentHoldings}}
{{#each currentHoldings}}
- {{{symbol}}}: {{{shares}}} units, $ {{{value}}} current valuation
{{/each}}
{{else}}
NO CURRENT EQUITY EXPOSURE.
{{/if}}

Intelligence Directives:
1. DIVERSIFICATION: Balance Tech-heavy stocks with Bonds based on risk profile.
2. GROWTH: For 'high' risk, identify high-alpha growth sectors (Technology, AI).
3. STABILITY: For 'low' risk, prioritize rebalancing into Bond ETFs and Treasuries to protect the principal.
4. REASONING: Provide clear, data-driven reasoning for every recommended buy or sell to maximize user trust.

Captured yield and profit should be the primary outcome of these actions.`,
});

const stockBotFlow = ai.defineFlow(
  {
    name: 'stockBotFlow',
    inputSchema: StockBotInputSchema,
    outputSchema: StockBotOutputSchema,
  },
  async (input) => {
    const { output } = await stockBotPrompt(input);
    if (!output) throw new Error('AI Equity Engine returned null.');
    return output;
  }
);
