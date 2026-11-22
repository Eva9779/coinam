import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 *
 * We use the standard environment variable lookup to ensure the API key
 * is correctly identified by the Google AI plugin.
 */
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey
    })
  ],
});
