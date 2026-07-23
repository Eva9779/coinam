
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
  amount: z.number(),
  reasoning: z.string(),
});

const TradingBotOutputSchema = z.object({
  strategy: z.string().describe('Short strategy summary.'),
  actions: z.array(TradingActionSchema).describe('List of trade actions.'),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return tradingBotFlow(input);
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `Analyze the market and user assets to determine a profitable rebalancing strategy.

Market:
{{#each marketData}}
- {{{currency}}}: Price $ {{{price}}}, 24h Change: {{{change24h}}}%
{{/each}}

User Assets:
{{#each assets}}
- {{{currency}}}: Amount {{{amount}}}, Value $ {{{fiatValue}}}
{{/each}}

Risk: {{{riskTolerance}}}
Limit: $ {{{allocationLimitUSD}}}

Instructions:
1. Maximize yield while minimizing drawdown.
2. Provide short actions (buy/sell).
3. Ensure 'fromAsset' has sufficient balance.
4. Total USD of actions must be under the Allocation Limit.
5. Rebalance towards high momentum assets.

Output in JSON.`,
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
