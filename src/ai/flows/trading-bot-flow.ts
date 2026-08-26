'use server';
/**
 * @fileOverview This file defines a Genkit flow for the Google Antigravity AI Strategy Agent.
 * High-performance institutional rebalancing bot focused on profit capture.
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
  strategyType: z.enum(['standard', 'bitcoin_multiplier']).default('standard'),
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
  strategy: z.string().describe('Institutional strategy summary.'),
  actions: z.array(TradingActionSchema).describe('List of rebalancing actions to capture profit.'),
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

// Define prompt before use, ensuring schema is initialized
const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are an institutional quantitative strategy agent for Google Antigravity. Your primary directive is Alpha capture (profit) and portfolio optimization.

Strategy: {{{strategyType}}}
Risk Profile: {{{riskTolerance}}}
Capital Cap: $ {{{allocationLimitUSD}}}

Market Data:
{{#each marketData}}
- {{{currency}}}: $ {{{price}}} ({{{change24h}}}% 24h)
{{/each}}

User Assets:
{{#each assets}}
- {{{currency}}}: Value $ {{{fiatValue}}}
{{/each}}

Instructions for Maximum Intelligence:
1. ANALYZE MOMENTUM: Identify assets with 24h gains above 2.5% as momentum candidates.
2. REBALANCE FOR PROFIT: If an asset has surged, recommend partial profit taking (sell) to move capital into stable or high-conviction growth assets.
3. BITCOIN MULTIPLIER: If strategy is 'bitcoin_multiplier', aggressively rebalance secondary assets into BTC during bullish trends to capitalize on the primary market mover.
4. EXECUTION: Every action must be backed by institutional-grade reasoning. Avoid "Hold" unless the portfolio is perfectly balanced for the current volatility.

Your goal is to increase the 'Total Value' of the portfolio through strategic swaps.`,
});

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    const { output } = await tradingBotPrompt(input);
    if (!output) throw new Error('AI Engine failed to generate strategic response.');
    return output;
  }
);
