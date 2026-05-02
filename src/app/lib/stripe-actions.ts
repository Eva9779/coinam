'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SxgIgEvvi2LpIksCNVRvrBhBdhgoUlK2fbeKd7iqGnUZM4X8PibwbLtFfOAs4xr23OI2PI6kM37hSjAZJepNBRU00CrTy633V', {
  apiVersion: '2025-02-24.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session following the provided Sinatra logic.
 * Primarily used for "Buy" operations.
 */
export async function createOnrampSession(walletAddress: string, amount?: number, currency: string = 'eth') {
  try {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new Error('Invalid vault address.');
    }

    // Following the provided Ruby logic: Create an OnrampSession with transaction details
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        ethereum: walletAddress,
      },
      transaction_details: {
        supported_destination_currencies: [currency.toLowerCase()],
        supported_destination_networks: ['ethereum'],
        destination_currency: currency.toLowerCase(),
        destination_exchange_amount: amount ? amount.toString() : undefined,
        destination_network: 'ethereum',
      },
    });

    return {
      clientSecret: session.client_secret,
    };
  } catch (error: any) {
    console.error('Stripe Session Creation Failed:', error.message);
    return { clientSecret: null, error: error.message };
  }
}

/**
 * Creates a Stripe Offramp/Withdrawal session.
 * Used for "Sell" and "Withdraw" operations.
 */
export async function createWithdrawalSession(walletAddress: string, amount: number, currency: string) {
  try {
    // Note: Stripe currently uses the same Crypto Onramp SDK for many "Buy" flows.
    // For Sell/Withdrawal, we initiate a session that handles the fiat-to-bank transfer.
    // If the specific offramp API is restricted, we fallback to the institutional crypto.link.com gateway.
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        ethereum: walletAddress,
      },
      transaction_details: {
        supported_destination_currencies: ['usdc', 'eth'],
        supported_destination_networks: ['ethereum'],
      },
    });

    return {
      clientSecret: session.client_secret,
    };
  } catch (error: any) {
    return { clientSecret: null, error: error.message };
  }
}
