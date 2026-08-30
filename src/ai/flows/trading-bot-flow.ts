'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * Optimized with a high-performance Local Quantitative Engine for regional resilience.
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
  const sol = input.marketData.find(m => m.currency === 'SOL');
  const riskMultiplier = input.riskTolerance === 'high' ? 2 : input.riskTolerance === 'low' ? 0.5 : 1;

  // Logic: Accumulate BTC on momentum
  if (btc && btc.change24h > 0.5) {
    actions.push({
      type: 'buy',
      fromAsset: 'USDC',
      toAsset: 'BTC',
      amountUSD: Math.min(input.allocationLimitUSD * 0.1 * riskMultiplier, 50),
      reasoning: `LOCAL PROTOCOL: Captured ${btc.change24h}% BTC momentum. Rebalancing into primary reserve.`
    });
  }

  // Logic: Take profits on SOL if up significantly
  if (sol && sol.change24h > 5) {
    actions.push({
      type: 'sell',
      fromAsset: 'SOL',
      toAsset: 'USDC',
      amountUSD: Math.min(input.allocationLimitUSD * 0.05, 25),
      reasoning: 'LOCAL PROTOCOL: SOL volatility high (>5%). Locking in decentralized gains.'
    });
  }

  // Logic: Bitcoin Multiplier specific strategy
  if (input.strategyType === 'bitcoin_multiplier' && btc) {
     actions.push({
      type: 'buy',
      fromAsset: 'USDC',
      toAsset: 'BTC',
      amountUSD: 25 * riskMultiplier,
      reasoning: 'LOCAL PROTOCOL: Multiplier mode active. Aggressive accumulation protocol engaged.'
    });
  }

  return {
    strategy: 'LOCAL QUANTITATIVE PROTOCOL',
    actions,
    marketSentiment: btc && btc.change24h > 0 ? 'bullish' : 'neutral',
    error: `AI Link Offline (Regional/Key Restriction). Using Local Enclave Logic.`
  };
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: TradingBotOutputSchema },
      prompt: `You are an institutional quantitative strategy agent for Coin A,M. 
      Strategy Type: ${input.strategyType}
      Risk Profile: ${input.riskTolerance}
      Portfolio Context: ${JSON.stringify(input.assets)}
      Market Vision: ${JSON.stringify(input.marketData)}
      Directives: Rebalance to capture alpha. Protect principal liquidity.`,
    });

    if (!output) throw new Error('AI Engine null');
    return output;
  } catch (error: any) {
    // If AI fails due to regional restrictions (Jamaica) or key issues, use the high-performance local engine.
    return getLocalStrategy(input, error.message);
  }
}
