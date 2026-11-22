'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Crypto Strategy Agent.
 * Optimized for Standard Spot Momentum on Ethereum Mainnet assets.
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
  strategyType: z.enum(['standard', 'bitcoin_multiplier', 'sol_yield', 'bnb_surge', 'xrp_bridge']).default('standard'),
  assets: z.array(z.object({
    currency: z.string(),
    amount: z.number(),
    fiatValue: z.number(),
  })),
  marketData: z.array(MarketEntrySchema),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  allocationLimitUSD: z.number(),
});
export type TradingBotInput = z.infer<typeof TradingBotInputSchema>;

const TradingActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  fromAsset: z.string(),
  toAsset: z.string(),
  amountUSD: z.number(),
  reasoning: z.string(),
  confidence: z.number().describe('Score from 0-100 on the probability of win.'),
});

const TradingBotOutputSchema = z.object({
  strategy: z.string(),
  actions: z.array(TradingActionSchema),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
  error: z.string().optional(),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the Senior Quantitative Crypto Strategist for Coin A,M. 
      MISSION: Capture structural breakouts in major crypto assets like BTC, ETH, SOL, and BNB.
      
      STRICT TRADING RULES (NO-LOSS SPOT):
      1. SELECTIVE TREND: Watch the market data: {{{marketData}}}. Identify assets that have dropped 2-3% today but remain in a long-term uptrend.
      2. ZERO LOSS: Only issue a SELL if the current price is higher than the entry price. 
      3. MICRO ALLOCATION: Use $5 increments of the total {{{allocationLimitUSD}}} to build positions.
      
      GOAL: Maximize win rate by skipping choppy market cycles. Only enter during high-probability breakouts.`,
});

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    const { output } = await tradingBotPrompt(input);
    return output!;
  }
);

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return tradingBotFlow(input);
}
