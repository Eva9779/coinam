
'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Coin A,M AI Trading Bot.
 *
 * - analyzeMarketAndTrade - A function that handles market analysis and suggests trade actions.
 * - TradingBotInput - The input type for the analysis.
 * - TradingBotOutput - The return type containing strategy and actions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketEntrySchema = z.object({
  currency: z.string(),
  price: z.number(),
  change24h: z.number(),
});

const TradingBotInputSchema = z.object({
  userId: z.string(),
  assets: z.array(z.object({
    currency: z.string(),
    amount: z.number(),
    fiatValue: z.number(),
  })),
  marketData: z.array(MarketEntrySchema),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  allocationLimitUSD: z.number().describe('The maximum amount of USD value the bot is allowed to trade.'),
});
export type TradingBotInput = z.infer<typeof TradingBotInputSchema>;

const TradingActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  fromAsset: z.string(),
  toAsset: z.string(),
  amountUSD: z.number().describe('The value of the trade in USD dollars.'),
  reasoning: z.string(),
});

const TradingBotOutputSchema = z.object({
  strategy: z.string().describe('Short strategy summary.'),
  actions: z.array(TradingActionSchema).describe('List of trade actions.'),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

/**
 * Utility function to handle rate limiting with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 429;
    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate Limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return withRetry(() => tradingBotFlow(input));
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are an institutional crypto rebalancing bot for Coin A,M. Your goal is to maximize yield and grow the user's portfolio value while staying within the USD Allocation Limit.

Market Data (Live):
{{#each marketData}}
- {{{currency}}}: Price $ {{{price}}}, 24h Change: {{{change24h}}}%
{{/each}}

User Assets (Live):
{{#each assets}}
- {{{currency}}}: Amount {{{amount}}}, Value $ {{{fiatValue}}}
{{/each}}

Risk: {{{riskTolerance}}}
Limit: $ {{{allocationLimitUSD}}}

Instructions:
1. Identify assets with positive 24h momentum and rebalance into them.
2. If the market is bearish (negative changes), move assets into USDC to preserve capital.
3. If the market is bullish, move USDC into high-performing assets (ETH, SOL, BTC).
4. Provide trade actions in USD values.
5. Total USD of actions must be under the Allocation Limit.
6. YOU MUST BE ACCURATE. Do not trade more than the user currently owns in a specific asset.
7. YOUR GOAL IS PROFIT.

Output in JSON format.`,
});

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    const { output } = await tradingBotPrompt(input);
    if (!output) throw new Error('AI failed to generate trading strategy.');
    return output;
  }
);
