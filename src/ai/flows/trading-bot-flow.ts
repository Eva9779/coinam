
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
  strategyType: z.enum(['standard', 'bitcoin_multiplier']).default('standard').describe('The type of AI bot strategy to employ.'),
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
 * Uses 30s initial delay to respect Gemini free tier restrictions.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 30000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString();
    const isRateLimit = 
      errorStr.includes('429') || 
      errorStr.includes('RESOURCE_EXHAUSTED') || 
      error.status === 429 || 
      error.message?.includes('quota');
      
    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate Limit hit (Trading Bot). Retrying in ${delay / 1000}s...`);
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
  prompt: `You are an institutional crypto rebalancing bot for Coin A,M. Your goal is aggressive capital appreciation. 

Strategy Type: {{{strategyType}}}
Risk Profile: {{{riskTolerance}}}
Allocation Limit: $ {{{allocationLimitUSD}}}

Market Data (Live):
{{#each marketData}}
- {{{currency}}}: Price $ {{{price}}}, 24h Change: {{{change24h}}}%
{{/each}}

User Assets (Live):
{{#each assets}}
- {{{currency}}}: Amount {{{amount}}}, Value $ {{{fiatValue}}}
{{/each}}

Instructions for Strategy Type 'standard':
1. Rebalance the portfolio to maintain a healthy risk/reward ratio.
2. If Risk is 'high', focus on high-momentum assets (gains above 5% in 24h).
3. Identify rebalancing opportunities to capture alpha.

Instructions for Strategy Type 'bitcoin_multiplier':
1. YOUR SOLE FOCUS IS BITCOIN (BTC) ACCUMULATION AND PROFIT MAXIMIZATION.
2. You must identify opportunities to DOUBLE, TRIPLE, or QUADRUPLE the value of the portfolio by leveraging Bitcoin market momentum.
3. If BTC is bullish, prioritize rebalancing other assets INTO Bitcoin to capture explosive growth.
4. If BTC is bearish, move to USDC and look for the exact bottom to "Buy the Dip" for a 2x-4x recovery play.
5. In 'high' risk mode, do not hold excess stablecoins; force allocations into BTC during upward trends.
6. YOUR TARGET IS EXPONENTIAL GROWTH (2x-4x) THROUGH BITCOIN FOCUS.

General Constraints:
- Provide trade actions in USD values.
- Total USD of actions must be under the Allocation Limit.
- Do not trade more than the user currently owns in a specific asset.
- Output in JSON format.`,
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
