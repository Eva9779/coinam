'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Crypto Strategy Agent.
 * Refactored to execute real on-chain actions via ethers v6.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executeBotStrategy } from '@/lib/trading-bot';

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
  confidence: z.number(),
});

const TradingBotOutputSchema = z.object({
  strategy: z.string(),
  actions: z.array(TradingActionSchema),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
  txHash: z.string().optional(),
  error: z.string().optional(),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the Senior Quantitative Crypto Strategist for Coin A,M on Base Sepolia.
      MISSION: Identify high-probability breakouts for real-world execution.
      
      STRATEGY: {{{strategyType}}}
      RISK: {{{riskTolerance}}}
      
      Generate a strategy output. If appropriate, recommend a trade action.`,
});

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return tradingBotFlow(input);
}

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    // 1. Analyze with AI
    const { output } = await tradingBotPrompt(input);
    if (!output) throw new Error('AI Analysis Failed');

    // 2. Execute Backend Execution (No Simulation)
    const result = await executeBotStrategy(input.userId, {
      type: input.strategyType,
      actions: output.actions
    });

    if (result.success) {
      return { ...output, txHash: result.hash };
    } else {
      return { ...output, error: result.error };
    }
  }
);
