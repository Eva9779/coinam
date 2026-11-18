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
  prompt: `You are the Senior Quantitative Strategist for Coin A,M. 
      MISSION: Capture structural breakouts in the R_100 index (Volatility 100 Index).
      
      ANALYSIS PROTOCOL:
      1. TICK STREAM: Analyzing the last 20 ticks: {{{tickStream}}}.
      2. MOMENTUM: Identify clear 3-5 tick trend shifts. Ignore 1-tick spikes.
      3. DECISION: If a momentum breakout is occurring, issue a 'buy' with confidence.
      4. RISK: If the price is at a 20-tick high/low, be wary of reversal (Mean Reversion).
      5. CONTRACT: Use 'CALL' for upward breakouts, 'PUT' for downward breakdowns.
      
      GOAL: Institutional high-probability scalping. Target confidence > 70 for actionable alpha.`,
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
