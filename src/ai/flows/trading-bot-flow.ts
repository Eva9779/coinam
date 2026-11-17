'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Enhanced with Principal Protection Protocols for absolute risk management.
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
    // Principal Protection: Only sell if profit is 3x higher than fees
    if (market && market.change24h > 1.5) {
      const gainUSD = asset.fiatValue * (market.change24h / 100);
      if (gainUSD > (assumedGasFee * 3)) {
        actions.push({
          type: 'sell',
          fromAsset: asset.currency,
          toAsset: 'USDC',
          amountUSD: asset.fiatValue,
          reasoning: `SAFETY SIGNAL: ${asset.currency} gains confirmed. Locking principal into Dollar Vault.`
        });
      }
    }
  });

  return {
    strategy: input.isGuardianMode ? 'GUARDIAN PROTECTION PROTOCOL' : 'ALPHA HARVESTER',
    actions: actions.length > 0 ? actions : [{ type: 'hold', fromAsset: 'USDC', toAsset: 'USDC', amountUSD: 0, reasoning: 'Market trend unconfirmed. Principal protected.' }],
    marketSentiment: 'neutral',
    error: `Guardian Active.`
  };
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are the Principal Protection Guardian for Coin A,M user {{{userId}}}. 
      MISSION: Your absolute priority is to ensure the user's balance is protected. You must only trade when trend signals are extremely strong.
      
      STRICT PROTECTION RULES:
      1. NO RISK: If market change is less than 1.5%, HOLD IMMEDIATELY. Protect the principal.
      2. PROFIT LOCK: Every successful signal must return value to the USDC Dollar Vault to prevent drawdown.
      3. GUARDIAN MODE: {{{#if isGuardianMode}}}Prioritize safety above all else. Ignore small spikes. Only act on major, confirmed trend surges.{{/if}}`,
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
