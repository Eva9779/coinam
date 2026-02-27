
'use server';

import Stripe from 'stripe';

/**
 * Lazy initialization of the Stripe client to prevent crashes if the API key is missing
 * during module evaluation (e.g., during build or before env vars are set).
 */
let stripeInstance: Stripe | null = null;

function getStripe() {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey || apiKey === '' || apiKey.includes('replace_with_your_key')) {
      throw new Error('STRIPE_SECRET_KEY is missing or invalid in your .env file. Please add your secret key from the Stripe Dashboard.');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }
  return stripeInstance;
}

/**
 * Creates a Stripe Onramp Session for the specified wallet address.
 */
export async function createOnrampSession(walletAddress: string) {
  try {
    const stripe = getStripe();
    
    // We create a session for the Ethereum network. 
    // You can customize destination currencies and networks here.
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
