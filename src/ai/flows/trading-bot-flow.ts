'use server';
/**
 * @fileOverview Alpha-Maximizing Institutional Strategy Agent.
 * High-performance bot focused on profit capture and liquidity protection.
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
 * Institutional error recovery with API diagnostics.
 * Updated to support new 'AQ.' auth keys.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 30000): Promise<T> {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("NEURAL LINK FAILURE: Missing API Key. Please provide your Gemini API key (AQ. or AIza format).");
    }
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString().toLowerCase();
    
    if (errorStr.includes('404') || errorStr.includes('not found')) {
      throw new Error("Model Not Found. This may occur if the API region is restricted. Please verify your 'AQ.' key at Google AI Studio.");
    }

    const isRateLimit = 
      errorStr.includes('429') || 
      errorStr.includes('resource_exhausted') || 
      error.status === 429 || 
      error.message?.toLowerCase().includes('quota');

    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate Limit hit (Trading). Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
}

export async function analyzeMarketAndTrade(input: TradingBotInput): Promise<TradingBotOutput> {
  try {
    return await withRetry(() => tradingBotFlow(input));
  } catch (error: any) {
    console.error('Trading Bot Flow Error:', error);
    return {
      strategy: 'NEURAL ERROR',
      actions: [],
      marketSentiment: 'neutral',
      error: `Neural Link Failure: ${error.message || 'Unknown internal error'}`
    };
  }
}

const tradingBotPrompt = ai.definePrompt({
  name: 'tradingBotPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: TradingBotInputSchema },
  output: { schema: TradingBotOutputSchema },
  prompt: `You are an institutional quantitative strategy agent. 
Your primary directive is Alpha capture (maximum profit) and rigorous capital protection.

DIRECTIVES:
1. YIELD MAXIMIZATION: Identify assets with momentum (2.5%+ growth) and capture profits by rebalancing into stable assets (USDC).
2. PRICE IMPACT AVOIDANCE: Only suggest trades where liquidity is sufficient. Avoid low-volume assets to prevent slippage losses.
3. INSTITUTIONAL ALPHA: Prioritize high-quality trades with clear momentum signals.
4. BITCOIN MULTIPLIER: If strategy is 'bitcoin_multiplier', accumulate BTC on pullbacks, but only if profitability is projected.

Strategy: {{{strategyType}}}
Risk Profile: {{{riskTolerance}}}
Capital Cap: $ {{{allocationLimitUSD}}}

Market Snapshot:
{{#each marketData}}
- {{{currency}}}: $ {{{price}}} ({{{change24h}}}% 24h)
{{/each}}

User Portfolio:
{{#each assets}}
- {{{currency}}}: Value $ {{{fiatValue}}}
{{/each}}

Evaluate liquidity and sentiment. Only output actions if a clear profit capture or hedging opportunity exists.`,
});

const tradingBotFlow = ai.defineFlow(
  {
    name: 'tradingBotFlow',
    inputSchema: TradingBotInputSchema,
    outputSchema: TradingBotOutputSchema,
  },
  async (input) => {
    const { output } = await tradingBotPrompt(input);
    if (!output) throw new Error('AI Engine failed to generate strategic response.');
    return output;
  }
);
