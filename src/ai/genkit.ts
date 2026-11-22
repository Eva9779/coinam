
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 * Robust API Key loading for production environments.
 * Prioritizes GEMINI_API_KEY or GOOGLE_GENAI_API_KEY from .env.
 */
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey
    })
  ],
});
