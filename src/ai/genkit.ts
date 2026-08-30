import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 *
 * Optimized for the new 'AQ.' authentication standard.
 * We force 'v1' to ensure compatibility with production-only Auth Keys,
 * resolving the common '404 v1beta' mismatch seen with newer project IDs.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey,
      apiVersion: 'v1' 
    })
  ],
});
