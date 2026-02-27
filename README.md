
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Deployment to Vercel

To see your changes live on Vercel, you must sync the code from this environment to your connected Git repository (e.g., GitHub).

### How to Sync Changes:
1. **Commit Changes**: Open the Git tab in the left sidebar. Enter a commit message and click **Commit**.
2. **Push Changes**: After committing, you **MUST** click the **Push** option (usually found in the `...` menu or by clicking the branch status) to send the code to GitHub.
3. **Vercel Automatic Build**: Vercel will detect the new push to your GitHub branch and start a deployment automatically. It takes ~1-2 minutes.

### Troubleshooting:
* **Feature Not Appearing?** Ensure you clicked **Push**. Vercel only deploys code that is pushed to GitHub.
* **Build Errors?** Check your Vercel Dashboard logs. Missing environment variables (`STRIPE_SECRET_KEY`) can sometimes cause build failures.
* **Env Vars**: Add your Stripe and Firebase keys to **Vercel Project Settings > Environment Variables**.

## Environment Variables
Ensure the following are set in your Vercel Dashboard:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- Firebase configuration variables

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
