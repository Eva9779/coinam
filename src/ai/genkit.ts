import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 * 
 * We explicitly pull the API key to ensure it's passed to the Google AI plugin.
 * The 'gemini-1.5-flash' model is used for high-performance institutional analysis.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
  model: 'gemini-1.5-flash',
});
