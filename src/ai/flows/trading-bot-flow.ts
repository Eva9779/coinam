'use server';
/**
 * Alpha-Maximizing Institutional Strategy Agent.
 * High-performance bot focused on profit capture and liquidity protection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

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
 * Local Institutional Fallback Strategy
 * Used when the Neural Link (AI) is unavailable.
 */
function getLocalStrategy(input: TradingBotInput): TradingBotOutput {
  const actions: any[] = [];
  const btc = input.marketData.find(m => m.currency === 'BTC');
  
  if (btc && btc.change24h > 2 && input.strategyType === 'bitcoin_multiplier') {
    actions.push({
      type: 'buy',
      fromAsset: 'USDC',
      toAsset: 'BTC',
      amountUSD: Math.min(input.allocationLimitUSD * 0.1, 50),
      reasoning: 'LOCAL PROTOCOL: Detected BTC momentum. Accumulating via fallback strategy.'
    });
  }

  return {
    strategy: 'LOCAL INSTITUTIONAL FALLBACK',
    actions,
    marketSentiment: btc && btc.change24h > 0 ? 'bullish' : 'neutral',
    error: 'AI Neural Link Offline (404/403). Using local quantitative defaults.'
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      input: { schema: TradingBotInputSchema },
      output: { schema: TradingBotOutputSchema },
      prompt: `You are an institutional quantitative strategy agent. 
      Strategy: ${input.strategyType}
      Risk: ${input.riskTolerance}
      Data: ${JSON.stringify(input.marketData)}
      Portfolio: ${JSON.stringify(input.assets)}
      Directives: Identify momentum > 2.5% and rebalance to USDC.`,
    });

    if (!output) throw new Error('AI Engine failed to generate response.');
    return output;
  } catch (error: any) {
    console.warn('AI Link Failure, switching to Local Protocol:', error.message);
    return getLocalStrategy(input);
  }
}
