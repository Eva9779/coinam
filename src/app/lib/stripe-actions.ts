
'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SxgIgEvvi2LpIksCNVRvrBhBdhgoUlK2fbeKd7iqGnUZM4X8PibwbLtFfOAs4xr23OI2PI6kM37hSjAZJepNBRU00CrTy633V', {
  apiVersion: '2024-12-18.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session following the provided Sinatra logic.
 * Dynamically determines the network based on the selected currency.
 */
export async function createOnrampSession(walletAddress: string, amount: string = '13.37', currency: string = 'usdc') {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Determine network based on currency to avoid initialization failures
    let network = 'ethereum';
    const cur = currency.toLowerCase();
    if (cur === 'sol') network = 'solana';
    if (cur === 'btc') network = 'bitcoin';

    // Create an OnrampSession matching the Sinatra logic parameters exactly
    // We use the SDK method which maps to /v1/crypto/onramp_sessions
    const session = await stripe.crypto.onrampSessions.create({
      transaction_details: {
        destination_currency: cur,
        destination_exchange_amount: amount,
        destination_network: network,
      },
      wallet_addresses: {
        [network]: walletAddress,
      },
      customer_ip_address: ip,
    });

    return {
      clientSecret: session.client_secret,
    };
  } catch (error: any) {
    console.error('Stripe Session Creation Failed:', error.message);
    // Return the specific Stripe error message to the UI
    return { 
      clientSecret: null, 
      error: error.message || 'The Stripe API returned an unknown error.' 
    };
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
