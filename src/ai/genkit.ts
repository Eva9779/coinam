import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 * 
 * Updated to support the new 'AQ.' authentication standard.
 * We explicitly pull the key from environment variables to ensure compatibility
 * with Firebase Studio's secret management.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
  model: 'googleai/gemini-1.5-flash',
});
