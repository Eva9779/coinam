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

const TARGET_SWING_PERCENT = 0.025; 
const TRADE_ETH_AMOUNT = ethers.parseEther("0.005"); 

interface BotState {
  isActive: boolean;
  holding: "ETH" | "USDC";
  lastReferencePrice: number; 
  lastUsdcReceivedRaw: string; 
  lastEthSoldWei: string;      
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

    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org"); 
    const currentPrice = await getOnChainEthPrice(provider);

    if (!stateSnap.exists) {
      const initialState: BotState = {
        isActive: false, 
        holding: "ETH",
        lastReferencePrice: currentPrice,
        lastUsdcReceivedRaw: "0",
        lastEthSoldWei: "0"
      };
      await stateRef.set(initialState);
      return;
    }

    const state = stateSnap.data() as BotState;

    if (!state.isActive) {
      return;
    }

    const privateKey = walletPrivateKey.value();

    if (state.holding === "ETH") {
      const targetSellPrice = state.lastReferencePrice * (1 + TARGET_SWING_PERCENT);
      if (currentPrice >= targetSellPrice) {
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
    else if (state.holding === "USDC") {
      const targetBuyPrice = state.lastReferencePrice * (1 - TARGET_SWING_PERCENT);
      if (currentPrice <= targetBuyPrice) {
        const usdcToSpend = BigInt(state.lastUsdcReceivedRaw);
        const previousEthSold = BigInt(state.lastEthSoldWei);
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