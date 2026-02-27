
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Critical Deployment Troubleshooting (Vercel)

If your changes (like "Buy Crypto") are not appearing on your Vercel URL (`vault-access.vercel.app`), follow these steps:

### 1. Verify Your Branch
In the **bottom-left corner** of this Studio, note the branch name. 
- If it says `firebase-studio-xyz` (and not `main`), your changes are being pushed to that branch.
- Vercel, by default, only deploys the `main` branch to production.

**Fix**: Go to your **Vercel Dashboard > vault-access > Settings > Git** and update the "Production Branch" to match the branch name you see in the Studio.

### 2. Force a Redeploy
If you have pushed your changes but the site hasn't updated:
1. Go to your **Vercel Dashboard**.
2. Click on the **Deployments** tab.
3. Find the latest deployment, click the **three dots (...)**, and select **Redeploy**.

### 3. Check for Build Errors
If Vercel fails to build, your old version stays live. Look for errors in the "Build Logs" tab. Common causes:
- Missing environment variables (`STRIPE_SECRET_KEY`).
- Incompatible dependencies (though React 19 warnings are usually just warnings).

## Deployment Confirmation
Once successfully synced, you will see **"v1.0.7 - VAULT-ACCESS-LIVE"** in the top-right header of your application.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
