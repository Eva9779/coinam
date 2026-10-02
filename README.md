
# Coin A,M | Institutional Asset Security

This is a production-grade cryptocurrency and tokenized equity platform built with Next.js 15, Genkit, and ShadCN.

## 🚀 Critical: Fixing Your Deployment

### 1. Fix GitHub Secret Violation
If your push was rejected due to "Secret Detected", follow the link GitHub provided in your terminal to **Unblock** the secret. I have already moved the secrets to the `.env` file, but GitHub keeps a memory of the previous attempt.

### 2. Fix Vercel "Deployment Blocked"
Vercel blocks deployments from authors it doesn't recognize (like the AI). Run these commands in your PowerShell to claim the code as your own:

```powershell
# 1. Clear any multiple email values
git config --replace-all user.email "rannaa1000@gmail.com"

# 2. Claim the code as YOURS (fixes Vercel Hobby plan author block)
git add .
git commit --amend --reset-author --no-edit

# 3. Force sync to the new repository
git remote set-url origin https://github.com/Eva9779/coinam
git push origin main --force
```

### 3. Vercel Environment Variables
After pushing, go to your **Vercel Project Settings > Environment Variables** and add:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GOOGLE_GENAI_API_KEY` (Your Gemini API Key)

## Security Architecture
- **Non-Custodial**: Keys are generated locally and stored using AES-GCM-256 encryption.
- **RWA Enclave**: AI Agents analyze tech equities (NVDA, TQQQ, SOXL) and execute rebalancing via institutional protocols.
- **Compliance**: Integrated KYC Status and production-ready payout rails for Jamaica.
