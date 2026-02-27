'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Creates a Stripe Onramp Session for the specified wallet address.
 */
export async function createOnrampSession(walletAddress: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  }

  try {
    const session = await stripe.crypto.onrampSessions.create({
      wallet_addresses: {
        ethereum: walletAddress,
      },
      // You can specify more constraints here if needed, like transaction_details
    });

    return {
      clientSecret: session.client_secret,
    };
  } catch (error: any) {
    console.error('Stripe Onramp Error:', error);
    throw new Error(error.message || 'Failed to create Stripe onramp session.');
  }
}
