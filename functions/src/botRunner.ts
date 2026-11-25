import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ethers } from "ethers";
import {
  getAssetOraclePrice,
  swapAssetToUsdc,
  swapUsdcToAsset
} from "./tradingBot";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const walletPrivateKey = defineSecret("WALLET_PRIVATE_KEY");

const TARGET_SWING_PERCENT = 0.025; 

interface BotState {
  isActive: boolean;
  targetAsset: "ETH" | "BTC" | "SOL";
  holding: "ASSET" | "USDC";
  lastReferencePrice: number; 
  lastUsdcReceivedRaw: string; 
  lastAssetSoldRaw: string;      
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

    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org"); 
    
    // 1. Initialization logic
    if (!stateSnap.exists) {
      const currentPrice = await getAssetOraclePrice(provider, "ETH");
      const initialState: BotState = {
        isActive: false, 
        targetAsset: "ETH",
        holding: "ASSET",
        lastReferencePrice: currentPrice,
        lastUsdcReceivedRaw: "0",
        lastAssetSoldRaw: "0"
      };
      await stateRef.set(initialState);
      return;
    }

    const state = stateSnap.data() as BotState;
    if (!state.isActive) return;

    const assetSymbol = state.targetAsset || "ETH";
    const currentPrice = await getAssetOraclePrice(provider, assetSymbol);
    const privateKey = walletPrivateKey.value();

    // ========================================================================
    // CASE A: HOLDING ASSET -> SELL ON PRICE RISE
    // ========================================================================
    if (state.holding === "ASSET") {
      const targetSellPrice = state.lastReferencePrice * (1 + TARGET_SWING_PERCENT);
      
      if (currentPrice >= targetSellPrice) {
        // Trade amount depends on asset type (e.g. 0.005 ETH vs 0.0002 BTC)
        const sellAmount = assetSymbol === "ETH" ? ethers.parseEther("0.005") : 
                          assetSymbol === "BTC" ? ethers.parseUnits("0.0002", 8) : 
                          ethers.parseEther("0.1");

        const expectedUsdValue = Number(ethers.formatUnits(sellAmount, assetSymbol === "BTC" ? 8 : 18)) * state.lastReferencePrice * 1.02;
        const minExpectedUsdcOut = ethers.parseUnits(expectedUsdValue.toFixed(6), 6);

        const result = await swapAssetToUsdc(privateKey, assetSymbol, sellAmount, minExpectedUsdcOut);

        if (result.executed && result.txHash && result.usdcReceivedEstimate) {
          const usdcReceivedUnits = ethers.parseUnits(result.usdcReceivedEstimate, 6).toString();

          await stateRef.update({
            holding: "USDC",
            lastReferencePrice: currentPrice,
            lastUsdcReceivedRaw: usdcReceivedUnits,
            lastAssetSoldRaw: sellAmount.toString(),
            updatedAt: FieldValue.serverTimestamp()
          });

          await db.collection("tradeLogs").add({
            side: `SELL_${assetSymbol}_FOR_USDC`,
            priceUsd: currentPrice,
            assetAmount: ethers.formatUnits(sellAmount, assetSymbol === "BTC" ? 8 : 18),
            usdcAmount: result.usdcReceivedEstimate,
            txHash: result.txHash,
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }
    }
    // ========================================================================
    // CASE B: HOLDING USDC -> BUY ON PRICE DIP
    // ========================================================================
    else if (state.holding === "USDC") {
      const targetBuyPrice = state.lastReferencePrice * (1 - TARGET_SWING_PERCENT);
      
      if (currentPrice <= targetBuyPrice) {
        const usdcToSpend = BigInt(state.lastUsdcReceivedRaw);
        const previousAssetSold = BigInt(state.lastAssetSoldRaw);
        const minExpectedAssetOut = (previousAssetSold * 1015n) / 1000n;

        const result = await swapUsdcToAsset(privateKey, assetSymbol, usdcToSpend, minExpectedAssetOut);

        if (result.executed && result.txHash && result.assetReceivedEstimate) {
          await stateRef.update({
            holding: "ASSET",
            lastReferencePrice: currentPrice,
            lastUsdcReceivedRaw: "0",
            lastAssetSoldRaw: "0",
            updatedAt: FieldValue.serverTimestamp()
          });

          await db.collection("tradeLogs").add({
            side: `BUY_${assetSymbol}_WITH_USDC`,
            priceUsd: currentPrice,
            usdcSpent: ethers.formatUnits(usdcToSpend, 6),
            assetReceived: result.assetReceivedEstimate,
            txHash: result.txHash,
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }
    }
  }
);
