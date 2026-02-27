
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## 🚀 CRITICAL: Vercel Deployment Troubleshooting

If your changes (like "Buy Crypto" or the v1.0.8 version badge) are not appearing on your Vercel URL (`vault-access.vercel.app`), follow these exact steps:

### 1. Identify Your Branch
Look at the **bottom-left corner** of this Studio window.
- If it says anything other than `main` (e.g., `firebase-studio-xyz`), your changes are on that branch.
- Vercel, by default, only deploys the `main` branch to production.

### 2. Update Vercel Settings
1. Go to your **Vercel Dashboard** and select your project `vault-access`.
2. Go to **Settings > Git**.
3. In the "Production Branch" fieldbranch name, change it from `main` to the  you see in the Studio.
4. Click **Save**.

### 3. Trigger a Fresh Build
1. Go to the **Deployments** tab in Vercel.
2. Find the most recent deployment, click the **three dots (...)**, and select **Redeploy**.
3. Ensure "Use existing build cache" is **unchecked**.

### 4. Verify Version
Once successfully deployed, you will see **"v1.0.8 - VAULT-ACCESS-VERIFIED"** in the top-right header of your application.

---

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)
