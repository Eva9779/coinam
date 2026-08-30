
# Coin A,M | Asset Security

This is a high-performance cryptocurrency and tokenized equity wallet prototype built with Next.js, React, and Genkit.

## 🚀 Troubleshooting GitHub Push Errors

If you see the error `error: The following untracked working tree files would be overwritten by merge`, follow these exact steps in your terminal:

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
6. **Finalize and Push**:
   ```powershell
   git add .
   git commit -m "Final wallet sync"
   git push -u origin main
   ```

## Production Readiness & Compliance
- **Real-World Execution**: The app includes a blockchain layer (`lib/blockchain.ts`) capable of broadcasting real Mainnet transactions.
- **Security**: Private keys are protected using **Encryption-at-Rest** (AES-GCM). 
- **KYC/AML**: While Stripe/Onramper handle funding KYC, the platform owner is responsible for **Application-Level Compliance** for Stock/Bond trading services as required by local financial regulators.
- **Native Wallets**: Apple/Google Pay require Safari/Chrome and an HTTPS connection.

## AI Strategy Agents
- **Strategy Agent**: Quantitative crypto rebalancing via Mainnet broadcasts.
- **Equity Agent**: Tokenized Real World Asset (RWA) analysis for Stocks and Bonds.
- **DEX Integration**: Bot broadcasts are set as "Intents." Commercial production requires mapping the `data` field in `executeMainnetSwap` to a specific DEX Router (Uniswap/1inch).
