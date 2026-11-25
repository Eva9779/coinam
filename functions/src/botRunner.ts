import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ethers } from "ethers";
import {
  getOnChainEthPrice,
  swapEthToUsdc,
  swapUsdcToEth
} from "./tradingBot";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const walletPrivateKey = defineSecret("WALLET_PRIVATE_KEY");

// Strategy parameters
const TARGET_SWING_PERCENT = 0.025; // 2.5% price move required to trigger a trade
const TRADE_ETH_AMOUNT = ethers.parseEther("0.005"); // Amount of ETH to trade per cycle

interface BotState {
  isActive: boolean;
  holding: "ETH" | "USDC";
  lastReferencePrice: number; // ETH price in USD at last trade or initialization
  lastUsdcReceivedRaw: string; // Stored in 6-decimal integer string (e.g., "10500000" = $10.50)
  lastEthSoldWei: string;      // Stored in 18-decimal wei string
}

export const runTradingBot = onSchedule(
  {
    schedule: "every 5 minutes",
    secrets: [walletPrivateKey],
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async () => {
    const stateRef = db.collection("botState").doc("ethUsdcBot");
    const stateSnap = await stateRef.get();

    // Use a reliable RPC to read the current live on-chain price (Base Sepolia for testing)
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org"); 
    const currentPrice = await getOnChainEthPrice(provider);

    // 1. First-time initialization: Set baseline price without trading yet
    if (!stateSnap.exists) {
      const initialState: BotState = {
        isActive: false, // Safety: Keep false until you manually toggle true in Firestore
        holding: "ETH",
        lastReferencePrice: currentPrice,
        lastUsdcReceivedRaw: "0",
        lastEthSoldWei: "0"
      };
      await stateRef.set(initialState);
      console.log(`Initialized bot baseline at ETH = $${currentPrice.toFixed(2)}`);
      return;
    }

    const state = stateSnap.data() as BotState;

    // 2. Respect Start/Stop switch in Firestore
    if (!state.isActive) {
      console.log("Bot is paused (isActive = false). Skipping cycle.");
      return;
    }

    const privateKey = walletPrivateKey.value();

    // ========================================================================
    // CASE A: HOLDING ETH -> CHECK IF PRICE ROSE +2.5% TO SELL FOR USDC
    // ========================================================================
    if (state.holding === "ETH") {
      const targetSellPrice = state.lastReferencePrice * (1 + TARGET_SWING_PERCENT);
      console.log(`Holding ETH | Current: $${currentPrice.toFixed(2)} | Target Sell: $${targetSellPrice.toFixed(2)}`);

      if (currentPrice >= targetSellPrice) {
        // Require at least +2% net USDC output above reference value
        const expectedUsdValue = Number(ethers.formatEther(TRADE_ETH_AMOUNT)) * state.lastReferencePrice * 1.02;
        const minExpectedUsdcOut = ethers.parseUnits(expectedUsdValue.toFixed(6), 6);

        const result = await swapEthToUsdc(privateKey, TRADE_ETH_AMOUNT, minExpectedUsdcOut);

        if (result.executed && result.txHash && result.usdcReceivedEstimate) {
          const usdcReceivedUnits = ethers.parseUnits(result.usdcReceivedEstimate, 6).toString();

          await stateRef.update({
            holding: "USDC",
            lastReferencePrice: currentPrice,
            lastUsdcReceivedRaw: usdcReceivedUnits,
            lastEthSoldWei: TRADE_ETH_AMOUNT.toString(),
            updatedAt: FieldValue.serverTimestamp()
          });

          await db.collection("tradeLogs").add({
            side: "SELL_ETH_FOR_USDC",
            priceUsd: currentPrice,
            ethAmount: ethers.formatEther(TRADE_ETH_AMOUNT),
            usdcAmount: result.usdcReceivedEstimate,
            txHash: result.txHash,
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }
    }

    // ========================================================================
    // CASE B: HOLDING USDC -> CHECK IF PRICE DROPPED -2.5% TO BUY MORE ETH
    // ========================================================================
    else if (state.holding === "USDC") {
      const targetBuyPrice = state.lastReferencePrice * (1 - TARGET_SWING_PERCENT);
      console.log(`Holding USDC | Current: $${currentPrice.toFixed(2)} | Target Buy: $${targetBuyPrice.toFixed(2)}`);

      if (currentPrice <= targetBuyPrice) {
        const usdcToSpend = BigInt(state.lastUsdcReceivedRaw);
        const previousEthSold = BigInt(state.lastEthSoldWei);

        // Enforce strict ETH accumulation: Must receive at least +1.5% MORE ETH than we sold
        const minExpectedEthOutWei = (previousEthSold * 1015n) / 1000n;

        const result = await swapUsdcToEth(privateKey, usdcToSpend, minExpectedEthOutWei);

        if (result.executed && result.txHash && result.wethReceivedEstimate) {
          await stateRef.update({
            holding: "ETH",
            lastReferencePrice: currentPrice,
            lastUsdcReceivedRaw: "0",
            lastEthSoldWei: "0",
            updatedAt: FieldValue.serverTimestamp()
          });

          await db.collection("tradeLogs").add({
            side: "BUY_ETH_WITH_USDC",
            priceUsd: currentPrice,
            usdcSpent: ethers.formatUnits(usdcToSpend, 6),
            ethReceived: result.wethReceivedEstimate,
            txHash: result.txHash,
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }
    }
  }
);