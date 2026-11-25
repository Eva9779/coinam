import { NextResponse } from "next/server";
import * as admin from 'firebase-admin';
import { ethers } from "ethers";
import { decryptUserPrivateKey } from "@/lib/walletVault";
import { 
  getAssetOraclePrice, 
  sellAssetForUsdc, 
  buyAssetWithUsdc 
} from "@/lib/trading-bot";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const TARGET_SWING_PERCENT = 0.025; // 2.5%

export const dynamic = "force-dynamic";

/**
 * Institutional Global Cron Engine
 * Iterates through all active user bots and executes swaps on Base Mainnet.
 */
export async function GET(req: Request) {
  // Optional: Security check for cron secret
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const activeBotsSnap = await db.collection("userBots")
    .where("isActive", "==", true)
    .get();

  const results = [];

  for (const docSnap of activeBotsSnap.docs) {
    const bot = docSnap.data();
    const userId = docSnap.id;
    const assetSymbol = bot.targetAsset || "ETH";

    try {
      const currentPrice = await getAssetOraclePrice(provider, assetSymbol);
      const pk = decryptUserPrivateKey(bot.encryptedPrivateKey);

      // Initialize reference price if missing
      if (!bot.lastReferencePrice || bot.lastReferencePrice === 0) {
        await docSnap.ref.update({ lastReferencePrice: currentPrice });
        continue;
      }

      // CASE A: SELL ON PRICE RISE
      if (bot.holding === "ASSET") {
        const targetSellPrice = bot.lastReferencePrice * (1 + TARGET_SWING_PERCENT);
        if (currentPrice >= targetSellPrice) {
          const sellAmount = assetSymbol === "ETH" ? ethers.parseEther("0.005") : 
                            assetSymbol === "BTC" ? ethers.parseUnits("0.0002", 8) : 
                            ethers.parseEther("0.1");

          const result = await sellAssetForUsdc(pk, assetSymbol, sellAmount, 0n); // 0n relies on internal slippage
          
          if (result.executed) {
            await docSnap.ref.update({
              holding: "USDC",
              lastReferencePrice: currentPrice,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            results.push({ userId, status: "sold", asset: assetSymbol });
          }
        }
      } 
      // CASE B: BUY ON PRICE DIP
      else if (bot.holding === "USDC") {
        const targetBuyPrice = bot.lastReferencePrice * (1 - TARGET_SWING_PERCENT);
        if (currentPrice <= targetBuyPrice) {
          // Simplification: spend $20 USDC
          const usdcToSpend = ethers.parseUnits("20", 6);
          const result = await buyAssetWithUsdc(pk, assetSymbol, usdcToSpend, 0n);
          
          if (result.executed) {
            await docSnap.ref.update({
              holding: "ASSET",
              lastReferencePrice: currentPrice,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            results.push({ userId, status: "bought", asset: assetSymbol });
          }
        }
      }
    } catch (err: any) {
      console.error(`Bot Engine Error [${userId}]:`, err.message);
    }
  }

  return NextResponse.json({ processed: activeBotsSnap.size, results });
}