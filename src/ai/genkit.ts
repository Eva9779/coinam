import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Institutional AI Enclave Configuration
 *
 * We removed the forced 'v1' version to allow the model registry to load
 * correctly for Gemini 1.5 Flash, resolving the 'Must supply a model' error.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey
    })
  ],
});
