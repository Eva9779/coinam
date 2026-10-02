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
  strategyType: z.enum(['standard', 'bitcoin_multiplier', 'sol_yield', 'bnb_surge', 'xrp_bridge']).default('standard'),
  assets: z.array(z.object({
    currency: z.string(),
    amount: z.number(),
    fiatValue: z.number(),
  })),
  marketData: z.array(MarketEntrySchema),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  allocationLimitUSD: z.number(),
  isGuardianMode: z.boolean().optional(),
});
export type TradingBotInput = z.infer<typeof TradingBotInputSchema>;

const TradingActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  fromAsset: z.string(),
  toAsset: z.string(),
  amountUSD: z.number(),
  reasoning: z.string(),
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
  const assumedGasFee = 7; 

  input.assets.forEach(asset => {
    if (asset.currency === 'USDC') return;
    const market = input.marketData.find(m => m.currency === asset.currency);
    if (market && market.change24h > 0) {
      const gainUSD = asset.fiatValue * (market.change24h / 100);
      if (gainUSD > assumedGasFee) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: asset.fiatValue,
          reasoning: `MONEY MACHINE: ${asset.currency} surge detected. Harvesting profit to USDC.`
        });
      }
    }
  });

  return {
    strategy: input.isGuardianMode ? '24/7 PROFIT GUARDIAN' : 'MONEY MACHINE PROTOCOL',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'Awaiting surge.' }],
    marketSentiment: 'neutral',
    error: `Local Enclave Active.`
  };
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the Autonomous Money Machine for Coin A,M user {{{userId}}}. 
      MISSION: Sell surging assets (BTC, ETH, BNB, SOL, XRP) into USDC the moment they cover gas fees ($7).
      STRATEGY: {{{strategyType}}}. Risk: {{{riskTolerance}}}.
      
      STRICT PROFIT RULES:
      1. DO NOT WAIT: If Gain USD > $7, SELL IMMEDIATELY.
      2. USDC LOCK: Every sale must return Principal + Profit to the USDC Dollar Vault.
      3. SMALL WINS: It is your duty to stack $1 and $2 wins.`,
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
