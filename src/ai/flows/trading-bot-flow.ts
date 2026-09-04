'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Optimized with Dynamic Profit Harvesting to sell as soon as gas fees are covered.
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
 * Local Quantitative Engine - Dynamic Break-Even Logic
 */
function getLocalStrategy(input: TradingBotInput, errorMsg: string): TradingBotOutput {
  const actions: any[] = [];
  const btc = input.marketData.find(m => m.currency === 'BTC');
  
  const totalLiquidity = input.assets.reduce((sum, a) => sum + a.fiatValue, 0);
  const targetTradeSize = Math.max(10, totalLiquidity * 0.2); 
  const assumedGasFee = 7; // Average $7 fee

  if (input.isGuardianMode) {
    input.assets.forEach(asset => {
      if (asset.currency === 'USDC') return;
      
      const market = input.marketData.find(m => m.currency === asset.currency);
      if (market && market.change24h > 0) {
        // Dynamic Break-Even: (Fee / Value) * 100 + 1% margin
        const breakEvenThreshold = (assumedGasFee / asset.fiatValue) * 100 + 1;
        
        if (market.change24h > breakEvenThreshold && asset.fiatValue >= 20) {
          actions.push({
            type: 'sell',
            fromAsset: asset.currency,
            toAsset: 'USDC',
            amountUSD: asset.fiatValue, 
            reasoning: `DYNAMIC HARVEST: ${asset.currency} surge of ${market.change24h}% covers fees and secures profit. Locking in $${asset.fiatValue.toFixed(2)} immediately.`
          });
        }
      }
    });
  } else {
    // Normal Bot Logic - Aggressive Growth
    if (btc && btc.change24h > -2 && totalLiquidity >= 20) {
      actions.push({
        type: 'buy',
        fromAsset: 'USDC',
        toAsset: 'BTC',
        amountUSD: Math.min(targetTradeSize, input.allocationLimitUSD),
        reasoning: `STRATEGY ENTRY: Accumulating BTC to build capital for next market surge.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? 'PROACTIVE MONEY MACHINE' : '24H GROWTH PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'MONITORING: Awaiting net profit opportunity (Gain > Gas Fees).' }],
    marketSentiment: (btc && btc.change24h > 0) ? 'bullish' : 'neutral',
    error: `Local Enclave Active.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are the Proactive 24-Hour Money Machine for Coin A,M. 
      YOUR MISSION: Constant monitoring of all available assets ($${input.assets.reduce((sum, a) => sum + a.fiatValue, 0).toFixed(2)}) to lock in profit.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      
      DYNAMIC PROFIT RULES:
      1. NO WAITING: Do not wait for 20-25% surges if a smaller profit is available.
      2. MATH FILTER: If an asset is UP, calculate if the gain in USD is GREATER than the $7 gas fee. 
      3. IF PROFIT > $7 FEE: SELL IMMEDIATELY into USDC. Do not risk the market going back down.
      4. PRIORITY: Secure the user's money. It is better to take a small $5 profit 10 times than wait for one big win that might never happen.
      5. HARVESTING: In Guardian Mode, your ONLY job is to sell rising assets the moment they become profitable after fees.
      6. If market is flat or in a loss after fees, return 'hold'.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
