'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

// SECURE: Keys are now pulled from environment variables to satisfy GitHub Push Protection.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session for institutional funding.
 */
export async function createOnrampSession(walletAddress: string, amount: string = '50.00', currency: string = 'usdc') {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    let network = 'ethereum';
    const cur = currency.toLowerCase();
    if (cur === 'sol') network = 'solana';

    const response: any = await stripe.rawRequest('POST', '/v1/crypto/onramp_sessions', {
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

    const onrampSession = response.data;

    if (!onrampSession || !onrampSession.client_secret) {
      throw new Error('Invalid response from Stripe API');
    }

    return {
      clientSecret: onrampSession.client_secret,
    };
  } catch (error: any) {
    console.error('Stripe Session Creation Failed:', error.message);
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
    const response: any = await stripe.rawRequest('POST', '/v1/crypto/onramp_sessions', {
      wallet_addresses: {
        ethereum: walletAddress,
      },
      transaction_details: {
        supported_destination_currencies: ['usdc', 'eth'],
        supported_destination_networks: ['ethereum'],
      },
    });

    return {
      clientSecret: response.data.client_secret,
    };
  } catch (error: any) {
    return { clientSecret: null, error: error.message };
  }
}
