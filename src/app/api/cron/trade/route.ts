import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ethers } from "ethers";
import { decryptUserPrivateKey } from "@/lib/walletVault";
import {
  TradableAsset,
  ASSETS,
  getAssetOraclePrice,
  sellAssetForUsdc,
  buyAssetWithUsdc
} from "@/lib/trading-bot";

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing");
  const serviceAccount = JSON.parse(rawKey.trim().replace(/^['"]|['"]$/g, ""));
  const existing = getApps().find((app) => app.name === "coinvault-admin");
  const adminApp = existing ?? initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  }, "coinvault-admin");
  return getFirestore(adminApp);
}

const TARGET_SWING_PERCENT = 0.025;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", 8453, {
    staticNetwork: true
  });

  const prices: Record<string, number> = {};
  try {
    const [ethP, btcP, solP] = await Promise.all([
      getAssetOraclePrice(provider, "ETH"),
      getAssetOraclePrice(provider, "BTC"),
      getAssetOraclePrice(provider, "SOL")
    ]);
    prices.ETH = ethP;
    prices.BTC = btcP;
    prices.SOL = solP;
  } catch (err) {
    return NextResponse.json({ error: "Oracle lookup failed" }, { status: 502 });
  }

  const db = getAdminFirestore();
  const activeBotsSnap = await db
    .collection("userBots")
    .where("isActive", "==", true)
    .get();

  const summary: any[] = [];

  for (const userDoc of activeBotsSnap.docs) {
    const userId = userDoc.id;
    const bot = userDoc.data();

    try {
      const asset: TradableAsset = bot.targetAsset || "ETH";
      const currentPrice = prices[asset];

      if (!bot.lastReferencePrice || bot.lastReferencePrice === 0) {
        await userDoc.ref.update({
          holding: "ASSET",
          lastReferencePrice: currentPrice,
          lastUsdcReceivedRaw: "0",
          lastAssetSoldRaw: "0"
        });
        summary.push({ userId, status: "Baseline initialized" });
        continue;
      }

      const userPrivateKey = decryptUserPrivateKey(bot.encryptedPrivateKey);

      if (bot.holding === "ASSET") {
        const targetSellPrice = bot.lastReferencePrice * (1 + TARGET_SWING_PERCENT);
        if (currentPrice >= targetSellPrice) {
          // Abstracted logic for sell
          const result = await sellAssetForUsdc(userPrivateKey, asset, 0n, 0n); 
          if (result.executed) summary.push({ userId, status: "SOLD", asset });
        }
      } else if (bot.holding === "USDC") {
        const targetBuyPrice = bot.lastReferencePrice * (1 - TARGET_SWING_PERCENT);
        if (currentPrice <= targetBuyPrice) {
          // Abstracted logic for buy
          const result = await buyAssetWithUsdc(userPrivateKey, asset, 0n, 0n);
          if (result.executed) summary.push({ userId, status: "BOUGHT", asset });
        }
      }
    } catch (err: any) {
      summary.push({ userId, error: err.message });
    }
  }

  return NextResponse.json({ processedUsers: activeBotsSnap.size, summary });
}
