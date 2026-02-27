# CoinVault | Asset Security

This is a high-performance cryptocurrency vault prototype built with Next.js, React, and Genkit.

## Development

The code you see here is managed within Firebase Studio. Any changes made by the AI partner are applied directly to the files in this environment.

## Deployment to Vercel

To push the changes made here to your live Vercel environment:

1. **Commit your changes**: Ensure all AI-generated modifications are saved.
2. **Push to GitHub**: Use the Git integration in this environment to push the latest code to your connected repository.
3. **Vercel Build**: Vercel will automatically detect the push and start a new deployment.

### Environment Variables
Ensure the following are set in your Vercel Dashboard:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (for AI features)
- Firebase configuration variables

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit (Google Gemini)
- **Database/Auth**: Firebase Firestore & Authentication
- **Payments**: Stripe Crypto Onramp
- **Blockchain**: Viem (Mainnet RPC)