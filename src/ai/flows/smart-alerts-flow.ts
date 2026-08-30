'use server';
/**
 * @fileOverview AI-powered Smart Alerts for Coin A,M.
 * Updated to support new 'AQ.' auth keys and robust 404 diagnostics.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SmartAlertsInputSchema = z.object({
  userId: z.string(),
  walletBalances: z.array(z.object({
    currency: z.string(),
    amount: z.number(),
    fiatValueUSD: z.number(),
  })),
  recentTransactions: z.array(z.any()),
  marketData: z.array(z.any()),
});
export type SmartAlertsInput = z.infer<typeof SmartAlertsInputSchema>;

const AlertSchema = z.object({
  type: z.enum(['unusual_transaction', 'large_transaction', 'significant_market_movement', 'low_balance_warning']),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  relatedAsset: z.string().optional(),
  transactionId: z.string().optional(),
  timestamp: z.string(),
});

const SmartAlertsOutputSchema = z.object({
  alerts: z.array(AlertSchema),
});
export type SmartAlertsOutput = z.infer<typeof SmartAlertsOutputSchema>;

export async function generateSmartAlerts(input: SmartAlertsInput): Promise<SmartAlertsOutput> {
  try {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      input: input,
      output: { schema: SmartAlertsOutputSchema },
      prompt: `You are an expert financial analyst for Coin A,M.
Analyze the provided data and identify any unusual or large transactions, as well as significant market changes.
Provide actionable insights for each alert.`,
    });

    if (!output) throw new Error('AI Alerts Engine returned no output.');
    return output;
  } catch (error: any) {
    console.warn('Smart Alerts AI Failure:', error.message);
    // Silent fail for alerts to avoid blocking UI, return empty array
    return { alerts: [] };
  }
}
