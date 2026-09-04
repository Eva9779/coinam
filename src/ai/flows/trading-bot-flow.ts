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
 */
function getLocalStrategy(input: TradingBotInput, errorMsg: string): TradingBotOutput {
  const actions: any[] = [];
  const btc = input.marketData.find(m => m.currency === 'BTC');
  
  // Calculate total available liquidity for scaling
  const totalLiquidity = input.assets.reduce((sum, a) => sum + a.fiatValue, 0);
  const targetTradeSize = Math.max(10, totalLiquidity * 0.2); 

  if (input.isGuardianMode) {
    // Dynamic Thresholds: Low = 4%, Med = 10%, High = 20-25%
    const threshold = input.riskTolerance === 'high' ? 20 : input.riskTolerance === 'medium' ? 10 : 4;
    
    input.assets.forEach(asset => {
      const market = input.marketData.find(m => m.currency === asset.currency);
      // Guardian Trigger: If asset is up and balance is enough to cover fee
      if (market && market.change24h > threshold && asset.fiatValue >= 20) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: asset.fiatValue, 
          reasoning: `HIGH ALPHA HARVEST: ${asset.currency} hit ${market.change24h}% surge. Locking in $${asset.fiatValue.toFixed(2)} at peak.`
        });
      }
    });
  } else {
    // Normal Bot Logic
    if (btc && btc.change24h > -2 && totalLiquidity >= 20) {
      actions.push({
        type: 'buy',
        fromAsset: 'USDC',
        toAsset: 'BTC',
        amountUSD: Math.min(targetTradeSize, input.allocationLimitUSD),
        reasoning: `STRATEGY ENTRY: Accumulating $${targetTradeSize.toFixed(2)} BTC while market is stable.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? 'AUTONOMOUS GUARDIAN MONEY MACHINE' : '24H QUANTITATIVE GROWTH PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'GUARDING PRINCIPAL: Awaiting profitable market movement.' }],
    marketSentiment: (btc && btc.change24h > 0) ? 'bullish' : 'neutral',
    error: `Local Engine Active.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are the 24-Hour Autonomous Money Machine for Coin A,M. 
      YOUR MISSION: Constantly monitor all available assets in the user's wallet (current vault: $${input.assets.reduce((sum, a) => sum + a.fiatValue, 0).toFixed(2)}) and find ways to grow the balance.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      RISK PROFILE: ${input.riskTolerance}.

      DYNAMIC ALPHA INSTRUCTIONS:
      1. DETECT ALL ASSETS: Scan ETH, BTC, SOL, and all others. 
      2. PROFIT TARGETS: For 'high' risk, wait for 15-25% surges before selling. For 'medium', aim for 8-12%. For 'low', lock in 3-5% gains.
      3. SAFE GROWTH RULE: Only suggest a trade if the profit is mathematically greater than the $5-$10 gas fee. 
      4. HARVESTING: In Guardian Mode, your primary job is to protect the user's winnings. Sell the peaks according to the targets.
      5. Always protect the principal. If no clear profit is available after fees, return 'hold'.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
