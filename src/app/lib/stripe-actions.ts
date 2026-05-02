'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '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', {
  apiVersion: '2024-12-18.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session following the provided Sinatra logic exactly.
 * Now using the Live Production Key provided by the user.
 */
export async function createOnrampSession(walletAddress: string, amount: string = '13.37', currency: string = 'usdc') {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Determine network based on currency - strictly adhering to Stripe supported networks
    let network = 'ethereum';
    const cur = currency.toLowerCase();
    if (cur === 'sol') network = 'solana';
    if (cur === 'btc') network = 'ethereum'; // Fallback for unsupported test networks

    // Matching the Sinatra raw_request structure precisely
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

    // Node.js SDK rawRequest returns { data: { ... }, headers: { ... }, status: 200 }
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
