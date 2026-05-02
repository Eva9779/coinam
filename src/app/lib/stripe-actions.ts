
'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SxgIgEvvi2LpIksCNVRvrBhBdhgoUlK2fbeKd7iqGnUZM4X8PibwbLtFfOAs4xr23OI2PI6kM37hSjAZJepNBRU00CrTy633V', {
  apiVersion: '2025-02-24.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session following the provided Sinatra logic.
 */
export async function createOnrampSession(walletAddress: string, amount: string = '13.37', currency: string = 'usdc') {
  try {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new Error('Invalid vault address.');
    }

    // Creating the session using the Stripe SDK
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        ethereum: walletAddress,
      },
      transaction_details: {
        destination_currency: currency.toLowerCase(),
        destination_exchange_amount: amount,
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
 */
export async function createWithdrawalSession(walletAddress: string, amount: number, currency: string) {
  try {
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
