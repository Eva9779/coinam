
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 * 
 * Uses the stable Gemini 1.5 Flash model for high-performance market analysis.
 * The apiKey is automatically pulled from GOOGLE_GENAI_API_KEY or GEMINI_API_KEY.
 */
export const ai = genkit({
  plugins: [
    googleAI()
  ],
  model: 'googleai/gemini-1.5-flash',
});
