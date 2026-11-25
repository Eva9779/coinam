
import { NextRequest, NextResponse } from "next/server";
import * as admin from 'firebase-admin';
import { ethers } from "ethers";
import { decryptUserPrivateKey } from "@/lib/walletVault";
import {
  TradableAsset,
  ASSETS,
  getAssetOraclePrice,
  sellAssetForUsdc,
  buyAssetWithUsdc
} from "@/lib/trading-bot";

/**
 * Institutional Trading Cron Enclave
 * Robustly initializes Admin SDK with Service Account credentials.
 */
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://coinvault-989b4-default-rtdb.firebaseio.com"
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error("Firebase Admin Init Error (Cron):", e);
  }
}

const TARGET_SWING_PERCENT = 0.025; // 2.5% move triggers a trade

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // 1. Verify secret cron password
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org", 8453, {
    staticNetwork: true
  });

  // 2. Fetch live prices for ETH, BTC, and SOL once per cycle
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

  const db = admin.firestore();
  const activeBotsSnap = await db
    .collection("userBots")
    .where("isActive", "==", true)
    .get();

  if (activeBotsSnap.empty) {
    return NextResponse.json({ status: "No active user bots.", prices });
  }

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
        summary.push({ userId, status: "Baseline initialized", asset, currentPrice });
        continue;
      }

      if (!process.env.MASTER_ENCRYPTION_SECRET) {
        summary.push({ userId, error: "MASTER_ENCRYPTION_SECRET missing on server" });
        continue;
      }

      const userPrivateKey = decryptUserPrivateKey(bot.encryptedPrivateKey);

      if (bot.holding === "ASSET") {
        const targetSellPrice = bot.lastReferencePrice * (1 + TARGET_SWING_PERCENT);

        if (currentPrice >= targetSellPrice) {
          const wallet = new ethers.Wallet(userPrivateKey, provider);
          let amountToSellRaw = 0n;

          if (asset === "ETH") {
            const bal = await provider.getBalance(wallet.address);
            const reserve = ethers.parseEther("0.0015");
            if (bal > reserve) amountToSellRaw = ((bal - reserve) * 80n) / 100n;
          } else {
            const token = new ethers.Contract(
              ASSETS[asset].tokenAddress,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const bal: bigint = await token.balanceOf(wallet.address);
            amountToSellRaw = (bal * 80n) / 100n;
          }

          if (amountToSellRaw <= 0n) {
            summary.push({ userId, status: "Low balance", asset });
            continue;
          }

          const humanAmount = Number(ethers.formatUnits(amountToSellRaw, ASSETS[asset].decimals));
          const minExpectedUsdc = ethers.parseUnits((humanAmount * bot.lastReferencePrice * 0.98).toFixed(6), 6);

          const result = await sellAssetForUsdc(userPrivateKey, asset, amountToSellRaw, minExpectedUsdc);

          if (result.executed && result.txHash && result.usdcReceived) {
            await userDoc.ref.update({
              holding: "USDC",
              lastReferencePrice: currentPrice,
              lastUsdcReceivedRaw: ethers.parseUnits(result.usdcReceived, 6).toString(),
              lastAssetSoldRaw: amountToSellRaw.toString(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await userDoc.ref.collection("tradeLogs").add({
              side: `SELL_${asset}_FOR_USDC`,
              asset, priceUsd: currentPrice, usdcAmount: result.usdcReceived,
              txHash: result.txHash, timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            summary.push({ userId, status: "SOLD", asset, txHash: result.txHash });
          }
        }
      } else if (bot.holding === "USDC") {
        const targetBuyPrice = bot.lastReferencePrice * (1 - TARGET_SWING_PERCENT);

        if (currentPrice <= targetBuyPrice) {
          const usdcToSpend = BigInt(bot.lastUsdcReceivedRaw || "0");
          const prevSoldRaw = BigInt(bot.lastAssetSoldRaw || "0");
          
          if (usdcToSpend <= 0n) {
            summary.push({ userId, status: "No USDC", asset });
            continue;
          }

          const minExpectedOut = (prevSoldRaw * 1010n) / 1000n; 
          const result = await buyAssetWithUsdc(userPrivateKey, asset, usdcToSpend, minExpectedOut);

          if (result.executed && result.txHash && result.amountReceived) {
            await userDoc.ref.update({
              holding: "ASSET",
              lastReferencePrice: currentPrice,
              lastUsdcReceivedRaw: "0",
              lastAssetSoldRaw: "0",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await userDoc.ref.collection("tradeLogs").add({
              side: `BUY_${asset}_WITH_USDC`,
              asset, priceUsd: currentPrice, amountReceived: result.amountReceived,
              txHash: result.txHash, timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            summary.push({ userId, status: "BOUGHT", asset, txHash: result.txHash });
          }
        }
      }
    } catch (err: any) {
      summary.push({ userId, error: err.message });
    }
  }

  return NextResponse.json({ processedUsers: activeBotsSnap.size, summary });
}
