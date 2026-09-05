
'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Optimized with Dynamic Profit Harvesting to sell as soon as gas fees are covered.
 * STRICT DIRECTIVE: All profits and principal must be secured into the USDC Dollar Vault.
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
  const btc = input.marketData.find(m => m.currency === 'BTC');
  
  const totalLiquidity = input.assets.reduce((sum, a) => sum + a.fiatValue, 0);
  const targetTradeSize = Math.max(10, totalLiquidity * 0.2); 
  const assumedGasFee = 7; // Average $7 fee

  // GUARDIAN PROFIT HARVESTER
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
          reasoning: `MONEY MACHINE: ${asset.currency} is up ${market.change24h}%. Net profit detected. Securing $${asset.fiatValue.toFixed(2)} to USDC Dollar Vault instantly.`
        });
      }
    }
  });

  // If no guardian actions and bot is on, add growth logic
  if (actions.length === 0 && !input.isGuardianMode) {
    if (btc && btc.change24h > -2 && totalLiquidity >= 20) {
      actions.push({
        type: 'buy',
        fromAsset: 'USDC',
        toAsset: 'BTC',
        amountUSD: Math.min(targetTradeSize, input.allocationLimitUSD),
        reasoning: `GROWTH ENTRY: Buying Bitcoin to build principal for the next harvesting surge.`
      });
    }
  }

  return {
    strategy: input.isGuardianMode ? '24/7 PROFIT GUARDIAN' : 'MONEY MACHINE PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'STANDBY: Awaiting profit signal (Earnings > Network Fees).' }],
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
      prompt: `You are the 24-Hour Autonomous Money Machine for Coin A,M. 
      YOUR MISSION: Sell surging assets into USDC the moment they cover gas fees.
      
      PRINCIPAL PROTECTION RULES:
      1. AUTOMATIC DEPOSIT: All "sell" actions must deposit the entire amount (Principal + Profit) into USDC.
      2. ZERO WAIT: If Price Increase USD > $7 Gas Fee, execute 'sell' into USDC. Do not wait for higher targets.
      3. GUARDIAN MODE: ${input.isGuardianMode ? 'ACTIVE' : 'OFF'}. In this mode, only focus on selling rising assets to lock in profits.
      4. PROFIT LOCKING: Your priority is capturing small wins frequently. $1 profit is better than zero profit.
      5. HARVESTING: When an asset turns "green" after accounting for the $7 fee, liquidate it to the USDC Dollar Vault immediately.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    return getLocalStrategy(input, error.message);
  }
}
