'use server';
/**
 * @fileOverview AI-powered Smart Alerts for Coin A,M.
 * Optimized for Genkit 1.x canonical flow standards.
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
  userAverageTransactionAmountUSD: z.number().optional(),
  userHighValueThresholdUSD: z.number().optional(),
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

/**
 * Local Security Scanner
 * Scans for balance issues and transaction anomalies locally.
 */
function getLocalAlerts(input: SmartAlertsInput): SmartAlertsOutput {
  const alerts: any[] = [];
  const timestamp = new Date().toISOString();

  input.walletBalances.forEach(asset => {
    if (asset.fiatValueUSD < 50 && asset.fiatValueUSD > 0) {
      alerts.push({
        type: 'low_balance_warning',
        title: `${asset.currency} Reserve Low`,
        description: `Your ${asset.currency} balance is below institutional safety thresholds ($50).`,
        severity: 'medium',
        relatedAsset: asset.currency,
        timestamp
      });
    }
  });

  input.recentTransactions.forEach(tx => {
    if (tx.fiatValueUSD > (input.userHighValueThresholdUSD || 5000)) {
      alerts.push({
        type: 'large_transaction',
        title: 'High Value Broadcast',
        description: `A transaction of $${tx.fiatValueUSD.toLocaleString()} was detected. Enclave monitoring active.`,
        severity: 'low',
        relatedAsset: tx.currency,
        transactionId: tx.id,
        timestamp
      });
    }
  });

  return { alerts };
}

const smartAlertsPrompt = ai.definePrompt({
  name: 'smartAlertsPrompt',
  input: { schema: SmartAlertsInputSchema },
  output: { schema: SmartAlertsOutputSchema },
  prompt: `You are an expert financial analyst for Coin A,M.
Analyze the provided data for user {{{userId}}} and identify any unusual or large transactions, as well as significant market changes.
Provide actionable insights for each alert. Use institutional-grade terminology.`,
});

const smartAlertsFlow = ai.defineFlow(
  {
    name: 'smartAlertsFlow',
    inputSchema: SmartAlertsInputSchema,
    outputSchema: SmartAlertsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await smartAlertsPrompt(input);
      if (!output) throw new Error('AI output null');
      return output;
    } catch (error: any) {
      return getLocalAlerts(input);
    }
  }
);

export async function generateSmartAlerts(input: SmartAlertsInput): Promise<SmartAlertsOutput> {
  return smartAlertsFlow(input);
}
