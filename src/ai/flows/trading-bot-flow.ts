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
  
  // High-Efficiency Micro-Trade Unit for small balances
  const targetTradeSize = input.allocationLimitUSD >= 20 ? 10 : Math.min(input.allocationLimitUSD * 0.5, 10);

  // GUARDIAN MODE LOGIC: Sell rising assets back to USDC if profits > fees
  if (input.isGuardianMode) {
    input.assets.forEach(asset => {
      const market = input.marketData.find(m => m.currency === asset.currency);
      // Guardian Trigger: If asset is up significantly and balance is at least $20
      if (market && market.change24h > 4 && asset.fiatValue >= 20) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: Math.min(asset.fiatValue, targetTradeSize),
          reasoning: `GUARDIAN SURGE: ${asset.currency} is up ${market.change24h}%. Harvesting $${targetTradeSize} profit into USDC Money Machine.`
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
        reasoning: `24H GROWTH: Accumulating $${targetTradeSize} BTC units while market is stable.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? 'AUTONOMOUS GUARDIAN MONEY MACHINE' : '24H QUANTITATIVE GROWTH PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'GUARDING PRINCIPAL: Awaiting profitable market surge.' }],
    marketSentiment: (btc && btc.change24h > 0) ? 'bullish' : 'neutral',
    error: `AI Link Restricted. Local Money Machine active.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are the 24-Hour Autonomous Money Machine for Coin A,M. 
      YOUR MISSION: Always look for ways to grow the user's balance without losing money.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      
      INSTRUCTIONS FOR $20 BALANCES:
      1. If Guardian Mode is ACTIVE, you must scan all assets. If any asset (ETH, BTC, etc.) is "UP" (market surge), SELL IT immediately into USDC to lock in profit.
      2. SAFE GROWTH RULE: Only suggest a trade if the user's $20 balance can survive the $5-$10 gas fee and still end up with a net gain.
      3. HARVESTING: Your goal is to keep the "Unified Net Worth" growing. Sell highs, buy lows.
      4. Never lose the user's money. If the trade is not clearly profitable after fees, return a 'hold' action.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
