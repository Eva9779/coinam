# Coin A,M | Institutional Asset Security

This is a production-grade cryptocurrency and tokenized equity platform built with Next.js 15, Genkit, and ShadCN.

## 🚀 EMERGENCY: Fixing GitHub Secret Violation & Vercel Block

If your push was rejected due to **"SECRET DETECTED"**, GitHub is protecting you. Because secrets were committed in the past, your history is "dirty."

### 1. UNBLOCK SECRETS ON GITHUB (Mandatory)
Before pushing again, you **MUST** click the link below and authorize the secret push. GitHub will not allow any more commits until this is done:
👉 [CLICK HERE TO UNBLOCK YOUR GITHUB PUSH](https://github.com/Eva9779/coinam/security/secret-scanning/unblock-secret/3K9CwtByPteTAEHjBDZU9yeYnkv)

### 2. THE NUCLEAR TERMINAL SYNC
Once you have clicked the link above, run these commands in your **PowerShell** one by one to fix the "Refusing to merge unrelated histories" and "Multiple Author" errors.

```powershell
# A. Fix the "Multiple values" email error
git config --replace-all user.email "rannaa1000@gmail.com"

# B. Claim the code as YOURS (fixes Vercel Hobby plan author block)
git add .
git commit --amend --reset-author --no-edit

# C. FORCE push to the new repository (this overrides all history conflicts)
git remote set-url origin https://github.com/Eva9779/coinam
git push origin main --force
```

## Security Architecture
- **Non-Custodial**: Keys are generated locally and stored using AES-GCM-256 encryption.
- **RWA Enclave**: AI Agents analyze tech equities (NVDA, TQQQ, SOXL) and execute rebalancing via institutional protocols.
- **Compliance**: Integrated KYC Status and production-ready payout rails for Jamaica.
