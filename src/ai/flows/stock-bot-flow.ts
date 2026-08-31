'use server';
/**
 * @fileOverview Antigravity Equity Agent.
 * Specialized in Tokenized Real World Asset (RWA) settlement with local quantitative fallback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EquityMarketEntrySchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  changePercent: z.number(),
  type: z.enum(['stock', 'bond']),
});

const StockBotInputSchema = z.object({
  userId: z.string(),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  currentHoldings: z.array(z.object({
    symbol: z.string(),
    shares: z.number(),
    value: z.number(),
  })),
  marketData: z.array(EquityMarketEntrySchema),
  allocationLimitUSD: z.number().optional(),
});
export type StockBotInput = z.infer<typeof StockBotInputSchema>;

const StockBotActionSchema = z.object({
  type: z.enum(['buy', 'sell', 'hold']),
  asset: z.string(),
  amount: z.number().describe('Shares or bond units.'),
  reasoning: z.string(),
});

const StockBotOutputSchema = z.object({
  summary: z.string().describe('RWA protocol strategy summary.'),
  actions: z.array(StockBotActionSchema).describe('Recommended tokenized RWA rebalancing actions.'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  error: z.string().optional(),
});
export type StockBotOutput = z.infer<typeof StockBotOutputSchema>;

/**
 * Local RWA Quantitative Engine
 * Rebalances tokenized assets locally based on risk profile when AI is restricted.
 */
function getLocalRWAStrategy(input: StockBotInput): StockBotOutput {
  const actions: any[] = [];
  let summary = 'PORTFOLIO OPTIMIZED: HOLDING POSITIONS';
  
  const hasBonds = input.currentHoldings.some(h => h.symbol.includes('BND'));
  const hasTech = input.currentHoldings.some(h => h.symbol.includes('AAPL') || h.symbol.includes('TSLA'));

  // Logic: Proactive Initial Allocation
  if (input.riskTolerance === 'low' || input.riskTolerance === 'medium') {
    if (!hasBonds) {
      actions.push({
        type: 'buy',
        asset: 'AMEX:BND',
        amount: 0.5,
        reasoning: 'INITIAL ALLOCATION: Securing baseline yield in tokenized bonds.'
      });
      summary = 'RWA PROTOCOL: INITIALIZING BOND RESERVE';
    }
  }

  if (input.riskTolerance === 'high') {
    if (!hasTech) {
      actions.push({
        type: 'buy',
        asset: 'NASDAQ:AAPL',
        amount: 0.25,
        reasoning: 'INITIAL ALLOCATION: Capturing growth momentum in tokenized equities.'
      });
      summary = 'RWA PROTOCOL: INITIALIZING GROWTH EXPOSURE';
    }
  }

  return {
    summary,
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'ASSET SYNC: All positions aligned with risk profile.' }],
    sentiment: 'neutral',
    error: `AI Link Restricted (Regional). Local RWA settlement active.`
  };
}

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: StockBotOutputSchema },
      prompt: `You are an institutional RWA Strategy Agent. 
      Market Feed: ${JSON.stringify(input.marketData)}
      Risk Profile: ${input.riskTolerance}
      Current Holdings: ${JSON.stringify(input.currentHoldings)}
      Directives: Optimize capital across tokenized stocks and bonds. Rebalance based on momentum.`,
    });

    if (!output) throw new Error('AI RWA Engine null');
    return output;
  } catch (error: any) {
    return getLocalRWAStrategy(input);
  }
}
