'use server';
/**
 * @fileOverview Proactive Equity Agent.
 * Specialized in immediate profit harvesting for Tokenized RWA assets.
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
  isGuardianMode: z.boolean().optional(),
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

function getLocalRWAStrategy(input: StockBotInput): StockBotOutput {
  const actions: any[] = [];
  const assumedGasFee = 7;
  
  input.currentHoldings.forEach(hold => {
    const market = input.marketData.find(m => m.symbol === hold.symbol || hold.symbol.includes(m.symbol));
    if (market && market.changePercent > 0) {
      const gainUSD = hold.value * (market.changePercent / 100);
      if (gainUSD > assumedGasFee) {
        actions.push({
          type: 'sell',
          asset: hold.symbol,
          amount: hold.shares,
          reasoning: `PROFIT HARVEST: ${hold.symbol} surged past fee cover. Liquidating to USDC.`
        });
      }
    }
  });

  return {
    summary: 'EQUITY HARVESTER ACTIVE',
    actions: actions.length > 0 ? actions : [{ type: 'hold', asset: 'PORTFOLIO', amount: 0, reasoning: 'Awaiting network fee cover.' }],
    sentiment: 'neutral',
    error: `Local Enclave Active.`
  };
}

const stockBotPrompt = ai.definePrompt({
  name: 'stockBotPrompt',
  input: { schema: StockBotInputSchema },
  output: { schema: StockBotOutputSchema },
  prompt: `You are the Proactive Equity Guardian for Coin A,M user {{{userId}}}.
      MISSION: Hunt for daily profit in TQQQ, SOXL, NVDA, and META. Risk: {{{riskTolerance}}}.
      
      HARVESTING RULES:
      1. NO DELAY: If (Gain in USD - $7 Gas) > $0, SELL IMMEDIATELY.
      2. LEVERAGE FOCUS: TQQQ and SOXL move 3X faster.
      3. SAFE LANDING: Always return value to the USDC Dollar Vault.
      4. SMALL WINS: $1 profit is a victory.`,
});

const stockBotFlow = ai.defineFlow(
  {
    name: 'stockBotFlow',
    inputSchema: StockBotInputSchema,
    outputSchema: StockBotOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await stockBotPrompt(input);
      if (!output) throw new Error('AI output null');
      return output;
    } catch (error: any) {
      return getLocalRWAStrategy(input);
    }
  }
);

export async function analyzeEquityMarket(input: StockBotInput): Promise<StockBotOutput> {
  return stockBotFlow(input);
}
