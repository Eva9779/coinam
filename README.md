
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Deployment to Vercel

To see your changes live on Vercel, you must sync the code from this environment to your connected Git repository (e.g., GitHub).

### How to Sync Changes:
1. **Commit Changes**: Open the Git tab in the left sidebar. Enter a commit message and click **Commit**.
2. **Push Changes**: After committing, you **MUST** click the **Push** option (usually found in the `...` menu or by clicking the branch status) to send the code to GitHub.
3. **Vercel Automatic Build**: Vercel will detect the new push to your GitHub branch and start a deployment automatically. It takes ~1-2 minutes.

### Troubleshooting (If changes don't appear):
* **Check Vercel Logs**: Go to your Vercel Project Dashboard. If a deployment failed, the logs will tell you why (e.g., missing environment variables).
* **Verify Branch**: Check which branch you are pushing from in this Studio (bottom-left corner). Ensure Vercel is configured to deploy from that specific branch.
* **Env Vars**: Ensure `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are added to **Vercel Project Settings > Environment Variables**.
* **Manual Redeploy**: If a push didn't trigger a build, you can manually trigger one from the Vercel "Deployments" tab by clicking "Redeploy" on the latest deployment.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
