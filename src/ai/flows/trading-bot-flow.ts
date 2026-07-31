'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Google Antigravity AI Strategy Agent.
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
 */
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

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return withRetry(() => tradingBotFlow(input));
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are an institutional crypto strategy agent for Google Antigravity. Your goal is aggressive capital appreciation. 

Strategy Type: {{{strategyType}}}
Risk Profile: {{{riskTolerance}}}
Allocation Limit: $ {{{allocationLimitUSD}}}

Market Data (Live):
{{#each marketData}}
- {{{currency}}}: Price $ {{{price}}}, 24h Change: {{{change24h}}}%
{{/each}}

User Assets (Live):
{{#if assets}}
{{#each assets}}
- {{{currency}}}: Amount {{{amount}}}, Value $ {{{fiatValue}}}
{{/each}}
{{else}}
CRITICAL: NO ASSETS DETECTED. If there are no assets, inform the user that funds are required for rebalancing.
{{/if}}

Instructions:
1. Rebalance the portfolio to maintain a healthy risk/reward ratio.
2. If Risk is 'high', focus on high-momentum assets (gains above 3% in 24h).
3. Identify rebalancing opportunities to capture alpha.
4. If the Strategy Type is 'bitcoin_multiplier', prioritize rebalancing other assets INTO Bitcoin during bullish trends.

CRITICAL: If the user has funds, you MUST identify at least one rebalancing action if the market sentiment justifies it. Do not just hold if there is significant momentum identified.
Total USD of actions must be under the Allocation Limit.
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
