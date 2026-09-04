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
        // PROACTIVE HARVEST: (Fee / Value) * 100 + 0.1% margin for any profit
        const breakEvenThreshold = (assumedGasFee / asset.fiatValue) * 100 + 0.1;
        
        if (market.change24h > breakEvenThreshold && asset.fiatValue >= 10) {
          actions.push({
            type: 'sell',
            fromAsset: asset.currency,
            toAsset: 'USDC',
            amountUSD: asset.fiatValue, 
            reasoning: `IMMEDIATE HARVEST: ${asset.currency} is up ${market.change24h}%. Net profit confirmed after fees. Locking in $${asset.fiatValue.toFixed(2)} to prevent missing the peak.`
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
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'MONITORING: Awaiting any net profit opportunity (Gain > Gas Fees).' }],
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
      YOUR MISSION: Sell assets the MOMENT they cover gas fees and show any profit.
      GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. 
      
      HARVESTING RULES:
      1. NO WAITING: Do not wait for 10% or 20% gains. If the market is up and the profit is even $0.01 after the $7 gas fee, SELL IMMEDIATELY.
      2. RISK PREVENTION: Markets drop quickly. Your job is to grab the profit now so it doesn't vanish.
      3. MATH FILTER: If Price Increase USD > $7 Gas Fee, execute 'sell' into USDC.
      4. IGNORE HIGH TARGETS: Your priority is high-frequency small wins. A series of $1 profits is better than waiting for a $10 profit that never comes.
      5. HARVESTING: In Guardian Mode, your ONLY job is to liquidate rising assets into stable USDC the moment they turn "green" after fees.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
