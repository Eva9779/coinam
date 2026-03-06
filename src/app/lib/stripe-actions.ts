
'use server';

import Stripe from 'stripe';

/**
 * Lazy initialization of the Stripe client to prevent crashes if the API key is missing.
 * v1.3.3 - Soft-fail logic added to prevent app crashes when keys are missing.
 */
let stripeInstance: Stripe | null = null;

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey === '' || apiKey.includes('replace_with_your_key')) {
    // Soft fail: return null instead of throwing, allowing the UI to use the fallback Link gateway.
    return null;
  }
  
  if (!stripeInstance) {
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
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new Error('Invalid wallet address.');
    }

    const stripe = getStripe();
    if (!stripe) {
      // Return null so the frontend knows to use the Native Link fallback.
      return { clientSecret: null };
    }
    
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
    console.warn('Stripe key missing or invalid. Falling back to Native Redirect.');
    return { clientSecret: null };
  }
}
