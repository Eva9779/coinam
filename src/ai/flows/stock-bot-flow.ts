'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Antigravity Equity Agent.
 * Specialized in Tokenized Real World Asset (RWA) settlement and yield optimization.
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
  actions: z.array(StockBotActionSchema).describe('Recommended tokenized RWA rebalancing actions.'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  error: z.string().optional(),
});
export type StockBotOutput = z.infer<typeof StockBotOutputSchema>;

/**
 * Enhanced retry logic for institutional stability.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 30000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    
    if (errorStr.includes('404') || errorStr.includes('not found')) {
      throw new Error("RWA Engine Model Not Found. Please ensure your API key starts with 'AIzaSy' and is active in Google AI Studio.");
    }

    const isRateLimit = 
      errorStr.includes('429') || 
      errorStr.includes('resource_exhausted') || 
      error.status === 429 || 
      error.message?.toLowerCase().includes('quota');

    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate Limit hit (RWA). Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    return await withRetry(() => stockBotFlow(input));
  } catch (error: any) {
    console.error('Stock Bot Flow Error:', error);
    return {
      summary: 'PROTOCOL ERROR',
      actions: [],
      sentiment: 'neutral',
      error: `RWA Protocol Failure: ${error.message || 'Unknown internal error'}`
    };
  }
}

const stockBotPrompt = ai.definePrompt({
  name: 'stockBotPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: StockBotInputSchema },
  output: { schema: StockBotOutputSchema },
  prompt: `You are an institutional RWA Strategy Agent at Google Antigravity. 
Your goal is decentralized capital allocation across Tokenized Stocks and Bonds.

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

Institutional Intelligence Directives:
1. TOKENIZED SETTLEMENT: Recommend actions to swap between Bond-backed tokens and Stock-backed tokens.
2. ALPHA CAPTURE: Increase exposure to Tech-heavy tokens (AAPL, GOOGL) during bullish sentiment.
3. HEDGING: Shift to Bond tokens (BND) when volatility increases, according to risk profile.
4. REASONING: Provide institutional-grade reasoning for every rebalance.

Your strategy will result in captured yield for the cryptographic enclave.`,
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
