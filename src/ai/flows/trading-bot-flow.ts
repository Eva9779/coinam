
'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Optimized with Dynamic Profit Harvesting to sell as soon as gas fees are covered.
 * STRICT DIRECTIVE: All profits and principal must be secured into the USDC Dollar Vault.
 * TARGETING: BTC, ETH, BNB, and SOL for maximum daily rotation.
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
  isGuardianMode: z.boolean().optional().describe('If true, the bot focus on selling rising assets to lock in profit.'),
});
export type TradingBotInput = z.infer<typeof TradingBotInputSchema>;

const TradingActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  fromAsset: z.string(),
  toAsset: z.string().describe('Must always be USDC for "sell" actions to secure profit.'),
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
  
  const totalLiquidity = input.assets.reduce((sum, a) => sum + a.fiatValue, 0);
  const targetTradeSize = Math.max(10, totalLiquidity * 0.2); 
  const assumedGasFee = 7; 

  // PROACTIVE HARVESTER: Target BTC, ETH, SOL, BNB
  input.assets.forEach(asset => {
    if (asset.currency === 'USDC') return;
    
    const market = input.marketData.find(m => m.currency === asset.currency);
    if (market && market.change24h > 0) {
      // Logic: (Market Gain USD) must be > $7 Fee
      const gainUSD = asset.fiatValue * (market.change24h / 100);
      
      if (gainUSD > assumedGasFee && asset.fiatValue >= 10) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: asset.fiatValue, 
          reasoning: `MONEY MACHINE: ${asset.currency} surge detected. Principal + Profit are being harvested into the USDC Dollar Vault to beat the network fees.`
        });
      }
    }
  });

  if (actions.length === 0 && !input.isGuardianMode) {
    const bestDip = input.marketData
      .filter(m => ['BTC', 'BNB', 'SOL', 'ETH'].includes(m.currency))
      .sort((a, b) => a.change24h - b.change24h)[0];

    if (bestDip && bestDip.change24h < 0 && totalLiquidity >= 20) {
      actions.push({
        type: 'buy',
        fromAsset: 'USDC',
        toAsset: bestDip.currency,
        amountUSD: Math.min(targetTradeSize, input.allocationLimitUSD),
        reasoning: `OPPORTUNITY: Entering ${bestDip.currency} at a discount to prepare for the next profitable harvest.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? '24/7 PROFIT GUARDIAN' : 'MONEY MACHINE PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'STANDBY: Assets are currently below the "Profit vs Fee" threshold. Maintaining principal.' }],
    marketSentiment: 'neutral',
    error: `Local Enclave Active.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are the Autonomous Money Machine for Coin A,M. 
      YOUR MISSION: Sell surging assets (BTC, ETH, BNB, SOL) into USDC the moment they cover gas fees ($7).
      
      STRICT PROFIT RULES:
      1. DO NOT WAIT: If Gain USD > $7, SELL IMMEDIATELY.
      2. TARGETS: SOL and BNB are your primary hunt targets due to their high volatility.
      3. USDC LOCK: Every sale must return the entire Principal + Profit to the USDC Dollar Vault.
      4. SMALL WINS: It is your duty to stack $1 and $2 wins hundreds of times a month.
      5. PROTECTION: Never execute a trade if the result leaves the user with less than they started.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
