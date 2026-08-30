'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Antigravity Equity Agent.
 * Specialized in Tokenized Real World Asset (RWA) settlement and yield optimization.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

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
 * Local RWA Fallback Strategy
 */
function getLocalRWAStrategy(input: StockBotInput): StockBotOutput {
  return {
    summary: 'LOCAL RWA PROTOCOL ACTIVE',
    actions: [],
    sentiment: 'neutral',
    error: 'AI Neural Link Offline (404). Accessing local RWA safety defaults.'
  };
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      input: { schema: StockBotInputSchema },
      output: { schema: StockBotOutputSchema },
      prompt: `You are an institutional RWA Strategy Agent. 
      Market Feed: ${JSON.stringify(input.marketData)}
      Risk: ${input.riskTolerance}
      Directives: Optimize capital across tokenized stocks and bonds.`,
    });

    if (!output) throw new Error('AI RWA Engine returned null.');
    return output;
  } catch (error: any) {
    console.warn('RWA AI Failure, switching to Local Protocol:', error.message);
    return getLocalRWAStrategy(input);
  }
}
