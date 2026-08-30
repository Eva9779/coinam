# Coin A,M | Asset Security

This is a high-performance cryptocurrency and tokenized equity wallet prototype built with Next.js, React, and Genkit.

## 🚀 Troubleshooting GitHub Push Errors

If you see the error `error: The following untracked working tree files would be overwritten by merge`, follow these exact steps in your PowerShell terminal:

1. **Abort any stuck process**:
   ```powershell
   git rebase --abort
   ```
2. **Track your current changes**:
   ```powershell
   git add .
   ```
3. **Move local changes to a temporary shelf**:
   ```powershell
   git stash
   ```
4. **Pull and integrate remote changes**:
   ```powershell
   git pull origin main --rebase
   ```
5. **Bring your local changes back**:
   ```powershell
   git stash pop
   ```
6. **Push to GitHub**:
   ```powershell
   git push -u origin main
   ```

## Native Wallet Requirements
- **Apple Pay**: Requires Safari on iOS or macOS.
- **Google Pay**: Requires Chrome on Android or Desktop.
- **Security**: Mandatory HTTPS connection. In Studio Preview (http), native wallets are hidden for your security.
- **Regional Note**: Stripe Crypto is restricted to US/EU. Users in **Jamaica** should use the **Coindisco** or **Aggregator** tabs.

## Tech Stack
- **Framework**: Next.js 15 (App Router / Turbopack)
- **AI**: Genkit (Google Gemini 1.5 Flash)
- **Database/Auth**: Firebase Firestore & Authentication
- **Blockchain**: Viem (Mainnet RPC)

## AI Agents
- **Strategy Agent**: Quantitative crypto rebalancing.
- **Equity Agent**: Tokenized Real World Asset (RWA) analysis for Stocks and Bonds.
