
'use server';
/**
 * @fileOverview This file defines a Genkit flow for the CoinVault AI Trading Bot.
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
  strategy: z.string().describe('The overall market strategy being deployed.'),
  actions: z.array(TradingActionSchema).describe('Specific trade actions to execute.'),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
  confidenceScore: z.number().min(0).max(100),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return tradingBotFlow(input);
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the CoinVault AI Quantum Trader, a high-frequency algorithmic bot.
Analyze the following market conditions and user assets to determine a profitable trading strategy.

Market Data:
{{#each marketData}}
- {{{currency}}}: Price $ {{{price}}}, 24h Change: {{{change24h}}}%
{{/each}}

User Assets:
{{#each assets}}
- {{{currency}}}: Amount {{{amount}}}, Fiat Value $ {{{fiatValue}}}
{{/each}}

Risk Tolerance: {{{riskTolerance}}}

Your goal is to maximize user earnings while minimizing drawdown. 
Provide a market sentiment, a strategy summary, and specific actions (buy, sell, or hold).
If you suggest a trade, ensure the user has sufficient balance in the 'fromAsset'.
Try to rebalance the portfolio towards assets with high positive momentum.

Output the analysis in the specified JSON format.`,
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
