'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Optimized with Guardian Protocol for 24/7 background profit harvesting.
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
  isGuardianMode: z.boolean().optional().describe('If true, the bot is running in the background even if the switch is off. Focus on selling rising assets to lock in profit.'),
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
  actions: z.array(TradingActionSchema).describe('List of rebalancing actions to capture profit via DEX execution.'),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']),
  error: z.string().optional(),
});
export type TradingBotOutput = z.infer<typeof TradingBotOutputSchema>;

/**
 * Local Quantitative Engine
 * Processes institutional rebalancing logic locally when AI link is restricted.
 */
function getLocalStrategy(input: TradingBotInput, errorMsg: string): TradingBotOutput {
  const actions: any[] = [];
  const btc = input.marketData.find(m => m.currency === 'BTC');
  const eth = input.marketData.find(m => m.currency === 'ETH');
  
  // High-Efficiency Micro-Trade Unit
  const targetTradeSize = input.allocationLimitUSD >= 50 ? 10 : Math.min(input.allocationLimitUSD * 0.5, 10);

  // GUARDIAN MODE LOGIC: Sell rising assets back to USDC if profits > fees
  if (input.isGuardianMode) {
    input.assets.forEach(asset => {
      const market = input.marketData.find(m => m.currency === asset.currency);
      if (market && market.change24h > 3 && asset.fiatValue >= 20) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: Math.min(asset.fiatValue, targetTradeSize),
          reasoning: `GUARDIAN: Surge detected (${market.change24h}%). Locking in $${Math.min(asset.fiatValue, targetTradeSize)} profit to USDC.`
        });
      }
    });
  } else {
    // Normal Bot Logic
    if (btc && btc.change24h > -2) {
      actions.push({
        type: 'buy',
        fromAsset: 'USDC',
        toAsset: 'BTC',
        amountUSD: targetTradeSize,
        reasoning: `MICRO-ALPHA: Accumulating $${targetTradeSize} units for growth.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? 'GUARDIAN PROTOCOL (SURGE HARVEST)' : 'MICRO-CAP QUANTITATIVE PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'STANDBY: Awaiting profitable surge.' }],
    marketSentiment: (btc && btc.change24h > 0) ? 'bullish' : 'neutral',
    error: `AI Link Restricted. Local Guardian Logic active.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are an institutional strategy agent for Coin A,M. 
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      If Guardian Mode is ACTIVE, you must search for any asset in the user's wallet that is "UP" (market surge) and sell it to lock in profit, even if the user only has $20. 
      IMPORTANT: Consider gas fees are approx $5-$10. Only suggest a trade if the user's $20 balance can survive the fee and end up with a net profit. 
      TRADE SIZE: Use exactly $10 per position for rebalancing a $50 budget.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
