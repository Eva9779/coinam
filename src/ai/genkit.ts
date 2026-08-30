import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 * 
 * Optimized for the new 'AQ.' authentication standard.
 * We prioritize the key from environment variables to ensure compatibility
 * with Firebase Studio's secret management and AI Studio projects.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey })
  ],
});
