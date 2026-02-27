
'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as any,
});

/**
 * Creates a Stripe Onramp Session for the specified wallet address.
 */
export async function createOnrampSession(walletAddress: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured on the server. Please add it to your environment variables.');
  }

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
    console.error('Stripe Onramp Error:', error);
    throw new Error(error.message || 'Failed to establish a secure onramp session.');
  }
}
