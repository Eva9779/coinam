
'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Antigravity Equity Agent.
 * Specialized in Tokenized Real World Asset (RWA) rebalancing for institutional yields.
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
  summary: z.string().describe('RWA protocol strategy summary.'),
  actions: z.array(StockBotActionSchema).describe('Recommended tokenized rebalancing actions.'),
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
  prompt: `You are an institutional RWA Strategy Agent at Google Antigravity. Your goal is decentralized capital allocation across Tokenized Stocks and Bonds.

Risk Profile: {{{riskTolerance}}}

Live RWA Market Feed:
{{#each marketData}}
- {{{symbol}}} ({{{name}}}): $ {{{price}}} ({{{changePercent}}}% Change) [{{{type}}}]
{{/each}}

Portfolio Snapshot:
{{#if currentHoldings}}
{{#each currentHoldings}}
- {{{symbol}}}: {{{shares}}} units, $ {{{value}}} current valuation
{{/each}}
{{else}}
NO CURRENT TOKENIZED EQUITY EXPOSURE.
{{/if}}

Intelligence Directives:
1. DECENTRALIZED SETTLEMENT: All actions rebalance tokenized assets directly within the user's cryptographic enclave.
2. DIVERSIFICATION: Balance Tech-heavy tokenized stocks with Bond-backed tokens based on risk profile.
3. ALPHA CAPTURE: Identify momentum in tokenized markets to increase the total portfolio valuation.
4. REASONING: Provide data-driven reasoning for every recommended swap to maximize user trust in the RWA protocol.

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
    if (!output) throw new Error('AI RWA Engine returned null.');
    return output;
  }
);
