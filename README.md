# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Deployment to Vercel

To see your changes live on Vercel, you must sync the code from this environment to your connected Git repository (e.g., GitHub).

### How to Sync Changes:
1. **Save All Files**: Ensure I (the AI) have finished generating the changes you requested.
2. **Git Commit & Push**: Use the **Git menu** in this Studio environment to commit your changes and **Push** them to your repository.
3. **Vercel Automatic Build**: Vercel will automatically detect the new push and start a deployment. It usually takes 1-2 minutes to go live.

### Why am I not seeing changes?
* **Did you Push?** Vercel only "sees" code that is pushed to GitHub. Saving files in the editor is not enough for Vercel to update.
* **Build Errors?** Check your Vercel Dashboard logs. If there's a build error (like a missing environment variable), Vercel will stop the deployment.
* **Env Vars**: Make sure `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are added to your **Vercel Project Settings > Environment Variables**.

## Environment Variables
Ensure the following are set in your Vercel Dashboard:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (for AI features)
- Firebase configuration variables (found in `src/firebase/config.ts`)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
