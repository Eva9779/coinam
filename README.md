
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Deployment to Vercel (Project: vault-access)

To see your changes live on Vercel, you must sync the code from this environment to your connected Git repository.

### How to Sync Changes:
1. **Commit Changes**: Open the Git tab (Source Control) in the left sidebar. Enter a commit message and click **Commit**.
2. **Push Changes**: After committing, you **MUST** click the **Push** option (found in the `...` menu or by clicking the branch status) to send the code to GitHub. **Vercel only deploys on a Push.**
3. **Check Vercel Dashboard**: Go to [vercel.com](https://vercel.com) and open your `vault-access` project. Look at the "Deployments" tab.
4. **Confirm Version**: Once the build finishes, look for the **v1.0.6** badge in the app header to confirm you are on the latest version.

### Troubleshooting (If changes don't appear):
* **Branch Mismatch**: Check the bottom-left corner of this Studio. If it says something like `firebase-studio-xyz` and NOT `main`, go to your **Vercel Settings > Git** and update the "Production Branch" to match that name.
* **Manual Redeploy**: If you pushed but nothing happened, go to the `vault-access` project in Vercel, click "Deployments", click the three dots on the top entry, and select **Redeploy**. This forces Vercel to pull the newest code from your repository.
* **Env Vars**: Ensure `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are added in **Vercel Project Settings > Environment Variables**.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
