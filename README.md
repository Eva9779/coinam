
# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## 🚀 CRITICAL: Troubleshooting "Compiling" Hangs

If your preview screen stays white or shows "Compiling /" for more than 20 seconds, follow these steps:

1.  **Refresh the Browser Tab**: Sometimes the dev server (Turbopack) needs a fresh request to finish the compilation cycle.
2.  **Verify Production Environment**: Features like Apple Pay and Google Pay **only appear on Production HTTPS URLs**.
3.  **Check Your Branch**: Ensure your changes are on the branch that Vercel is set to deploy (usually `main`).

## Native Wallet Requirements
- **Apple Pay**: Requires Safari on iOS or macOS.
- **Google Pay**: Requires Chrome on Android or Desktop.
- **Security**: Mandatory HTTPS connection. In Studio Preview (http), native wallets are hidden for your security.

## Tech Stack
- **Framework**: Next.js 15 (App Router / Turbopack)
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Onramper Aggregator / Stripe (Ready)
- **Blockchain**: Viem (Mainnet RPC)
