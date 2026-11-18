'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Enhanced with Live Tick-Stream Intelligence and Deriv Execution Parameters.
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
  strategyType: z.enum(['standard', 'bitcoin_multiplier', 'sol_yield', 'bnb_surge', 'xrp_bridge', 'deriv_indices']).default('standard'),
  assets: z.array(z.object({
    currency: z.string(),
    amount: z.number(),
    fiatValue: z.number(),
  })),
  marketData: z.array(MarketEntrySchema),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  allocationLimitUSD: z.number(),
  isGuardianMode: z.boolean().optional(),
  tickStream: z.array(z.number()).optional().describe('The last 20 ticks from Deriv for pattern analysis.'),
});
export type TradingBotInput = z.infer<typeof TradingBotInputSchema>;

const TradingActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  contractType: z.enum(['CALL', 'PUT']).optional().describe('Used specifically for Deriv Synthetic Indices. CALL for Rise, PUT for Fall.'),
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

function getLocalStrategy(input: TradingBotInput): TradingBotOutput {
  const actions: any[] = [];
  
  if (input.strategyType === 'deriv_indices' && input.tickStream && input.tickStream.length > 5) {
    const first = input.tickStream[0];
    const last = input.tickStream[input.tickStream.length - 1];
    const isRising = last > first;
    
    actions.push({
      type: 'buy',
      contractType: isRising ? 'CALL' : 'PUT',
      fromAsset: 'USD',
      toAsset: 'VOL100',
      amountUSD: 10,
      reasoning: `LOCAL ENCLAVE: ${isRising ? 'Rising' : 'Falling'} trend detected.`,
      confidence: 85
    });
  }

  return {
    strategy: input.isGuardianMode ? 'GUARDIAN PROTECTION PROTOCOL' : 'ALPHA HARVESTER',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'Market trend unconfirmed.', confidence: 0 }],
    marketSentiment: 'neutral'
  };
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the Senior Quantitative Strategist for Coin A,M user {{{userId}}}. 
      MISSION: Maximize alpha while maintaining a zero-loss tolerance for the user's principal balance.
      
      DERIV R_100 ANALYSIS PROTOCOL:
      1. TICK STREAM INTELLIGENCE: Analyzing last 20 ticks: {{{tickStream}}}.
      2. NOISE FILTER: A single tick surge is NOT a trend. You must identify sustained momentum over at least 3-5 consecutive ticks.
      3. VOLATILITY RANGE: If the difference between the high and low of the last 10 ticks is less than 0.1, the market is CHOPPY. Output 'hold'.
      4. TREND FATIGUE: Do not issue a 'buy' if the price has already surged significantly and is likely to revert. Look for the START of a trend.
      5. CONTRACT SELECTION: For Deriv Synthetic Indices:
         - Use contractType: 'CALL' only for strong upward breakouts.
         - Use contractType: 'PUT' only for strong downward collapses.
      
      STRICT EXECUTION RULES:
      1. HIGH CONFIDENCE ONLY: Only issue a 'buy' action if your calculated probability of a win is > 85%.
      2. ZERO TRAP: If momentum is flat, choppy, or reversing, you MUST output a 'hold' action. It is better to skip a win than to take a loss.`,
});

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await tradingBotPrompt(input);
      if (!output) throw new Error('AI output null');
      return output;
    } catch (error: any) {
      return getLocalStrategy(input);
    }
  }
);

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  return tradingBotFlow(input);
}
