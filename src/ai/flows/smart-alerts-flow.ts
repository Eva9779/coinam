'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating smart alerts for Coin A,M users.
 *
 * - generateSmartAlerts - A function that generates AI-powered alerts based on user transactions and market data.
 * - SmartAlertsInput - The input type for the generateSmartAlerts function.
 * - SmartAlertsOutput - The return type for the generateSmartAlerts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const TransactionSchema = z.object({
  id: z.string().describe('Unique identifier for the transaction.'),
  type: z.enum(['send', 'receive']).describe('Type of transaction: "send" or "receive".'),
  currency: z.string().describe('Cryptocurrency involved (e.g., "BTC", "ETH").'),
  amount: z.number().describe('Amount of cryptocurrency transacted.'),
  fiatValueUSD: z.number().describe('Fiat value of the transaction in USD.'),
  timestamp: z.string().datetime().describe('ISO 8601 formatted timestamp of the transaction.'),
  fromAddress: z.string().optional().describe('Sender address for "receive" transactions, or user address for "send".'),
  toAddress: z.string().optional().describe('Receiver address for "send" transactions, or user address for "receive".'),
  description: z.string().optional().describe('Optional description for the transaction.'),
});

const WalletBalanceSchema = z.object({
  currency: z.string().describe('Cryptocurrency symbol (e.g., "BTC", "ETH").'),
  amount: z.number().describe('Current balance of the cryptocurrency.'),
  fiatValueUSD: z.number().describe('Current fiat value of the balance in USD.'),
});

const MarketDataEntrySchema = z.object({
  currency: z.string().describe('Cryptocurrency symbol.'),
  currentPriceUSD: z.number().describe('Current price in USD.'),
  dailyChangePercent: z.number().describe('Percentage change in price over the last 24 hours.'),
  weeklyChangePercent: z.number().describe('Percentage change in price over the last 7 days.'),
  volume24hUSD: z.number().describe('24-hour trading volume in USD.'),
});

const SmartAlertsInputSchema = z.object({
  userId: z.string().describe('The unique identifier for the user.'),
  walletBalances: z.array(WalletBalanceSchema).describe('Current balances across all cryptocurrencies in the user wallet.'),
  recentTransactions: z.array(TransactionSchema).describe('A list of recent transactions for the user.'),
  marketData: z.array(MarketDataEntrySchema).describe('Recent market data for relevant cryptocurrencies.'),
  userAverageTransactionAmountUSD: z.number().optional().describe('Optional: Average transaction amount for the user in USD, to help identify unusual transactions.'),
  userHighValueThresholdUSD: z.number().optional().describe('Optional: A threshold in USD above which a transaction is considered large for this user.'),
});
export type SmartAlertsInput = z.infer<typeof SmartAlertsInputSchema>;

// Output Schema
const AlertSchema = z.object({
  type: z.enum(['unusual_transaction', 'large_transaction', 'significant_market_movement', 'low_balance_warning']).describe('The type of alert.'),
  title: z.string().describe('A concise title for the alert.'),
  description: z.string().describe('Detailed reasoning and insights for the alert.'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('The severity of the alert.'),
  relatedAsset: z.string().optional().describe('The cryptocurrency symbol related to the alert (e.g., "BTC").'),
  transactionId: z.string().optional().describe('The ID of the transaction if the alert is transaction-related.'),
  timestamp: z.string().datetime().describe('ISO 8601 formatted timestamp when the alert was generated.'),
});

const SmartAlertsOutputSchema = z.object({
  alerts: z.array(AlertSchema).describe('A list of generated smart alerts for the user.'),
});
export type SmartAlertsOutput = z.infer<typeof SmartAlertsOutputSchema>;

/**
 * Utility function to handle rate limiting with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 30000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = error.toString();
    const isRateLimit = 
      errorStr.includes('429') || 
      errorStr.includes('RESOURCE_EXHAUSTED') || 
      error.status === 429 || 
      error.message?.includes('quota');

    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate Limit hit (Alerts). Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateSmartAlerts(input: SmartAlertsInput): Promise<SmartAlertsOutput> {
  return withRetry(() => smartAlertsFlow(input));
}

const smartAlertsPrompt = ai.definePrompt({
  name: 'smartAlertsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: SmartAlertsInputSchema },
  output: { schema: SmartAlertsOutputSchema },
  prompt: `You are an expert financial analyst for Coin A,M, a secure cryptocurrency wallet application.
Your goal is to provide generative-AI-powered smart alerts to users based on their transaction history, wallet balances, and current market movements.
Analyze the provided data and identify any unusual or large transactions, as well as significant market changes that might impact the user's holdings.
Provide clear reasoning and actionable insights for each alert.

Consider the following criteria for generating alerts:
1.  **Unusual Transactions**:
    *   Transactions with amounts significantly different (e.g., 2x or 0.5x) from the user's typical average transaction amount.
2.  **Large Transactions**:
    *   Any single transaction exceeding a predefined threshold.
3.  **Significant Market Movements**:
    *   Cryptocurrencies with a daily price change greater than 10%.
4.  **Low Balance Warning**:
    *   If a user's balance drops below a safe threshold.

User ID: {{{userId}}}
Current Wallet Balances:
{{#each walletBalances}}
- Currency: {{{currency}}}, Amount: {{{amount}}}, Fiat Value: $ {{{fiatValueUSD}}}
{{/each}}

Recent Transactions:
{{#each recentTransactions}}
- ID: {{{id}}}, Type: {{{type}}}, Currency: {{{currency}}}, Amount: {{{amount}}}, Fiat Value: $ {{{fiatValueUSD}}}, Timestamp: {{{timestamp}}}, Description: {{{description}}}
{{/each}}

Current Market Data:
{{#each marketData}}
- Currency: {{{currency}}}, Current Price: $ {{{currentPriceUSD}}}, Daily Change: {{{dailyChangePercent}}}%, Volume: $ {{{volume24hUSD}}}
{{/each}}

Please generate a JSON object containing an array of alerts.
`,
});

const smartAlertsFlow = ai.defineFlow(
  {
    name: 'smartAlertsFlow',
    inputSchema: SmartAlertsInputSchema,
    outputSchema: SmartAlertsOutputSchema,
  },
  async (input) => {
    const currentTimestamp = new Date().toISOString();
    const { output } = await smartAlertsPrompt(input);

    if (!output) {
      throw new Error('Failed to generate smart alerts: LLM returned no output.');
    }

    const alertsWithCurrentTimestamp = output.alerts.map(alert => ({
      ...alert,
      timestamp: alert.timestamp || currentTimestamp 
    }));

    return { alerts: alertsWithCurrentTimestamp };
  }
);
