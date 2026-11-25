import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { ethers } from "ethers";

/**
 * Institutional RWA Execution Engine
 * Executes autonomous trades for tokenized stocks and bonds on Base Mainnet.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  const serviceAccount = JSON.parse(rawKey.trim().replace(/^['"]|['"]$/g, ""));
  const existing = getApps().find((app) => app.name === "coinvault-admin");
  const adminApp =
    existing ??
    initializeApp(
      { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
      "coinvault-admin"
    );
  return getFirestore(adminApp);
}

function decryptMnemonic(payload: string): string {
  const secret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!secret) throw new Error("MASTER_ENCRYPTION_SECRET missing");
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

const BASE_RPC = "https://mainnet.base.org";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

const RWA_TOKENS: Record<string, { address: string; decimals: number; feeTier: number }> = {
  NVDA: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 18, feeTier: 3000 },
  USDY: { address: "0x96F6eF951840721AdBF46Ac996b59E0235CB985C", decimals: 18, feeTier: 500 }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const activeUsersSnap = await db.collection("users").where("stockBotActive", "==", true).get();

    if (activeUsersSnap.empty) {
      return NextResponse.json({ status: "idle", message: "No active stock/bond bots." });
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const results: any[] = [];

    for (const userDoc of activeUsersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const symbol = userData.selectedStockSymbol || "USDY";
      const tokenCfg = RWA_TOKENS[symbol] || RWA_TOKENS.USDY;
      const allocationUsd = Number(userData.stockBotAllocation || 20);
      const harvestTarget = Number(userData.stockHarvestTarget || 0.021);

      const kitSnap = await db.collection("users").doc(userId).collection("security").doc("recoveryKit").get();
      if (!kitSnap.exists || !kitSnap.data()?.encryptedMnemonic) continue;

      const mnemonic = decryptMnemonic(kitSnap.data()!.encryptedMnemonic);
      const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

      const usdc = new ethers.Contract(BASE_USDC, ERC20_ABI, wallet);
      const rwaToken = new ethers.Contract(tokenCfg.address, ERC20_ABI, wallet);
      const router = new ethers.Contract(UNISWAP_V3_ROUTER, ROUTER_ABI, wallet);

      const usdcBal = await usdc.balanceOf(wallet.address);
      const rwaBal = await rwaToken.balanceOf(wallet.address);

      // Fetch real-time quote from Yahoo Finance API
      const ticker = symbol === "USDY" ? "SHY" : symbol;
      const priceRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`,
        { cache: "no-store" }
      );
      const priceJson = await priceRes.json();
      const livePrice = Number(priceJson?.chart?.result?.[0]?.meta?.regularMarketPrice || 0);
      
      if (!livePrice) {
        console.warn(`Price feed unavailable for ${symbol}`);
        continue;
      }

      const entryPrice = Number(userData.stockEntryPrice || 0);
      let currentLogs = userData.stockBotLogs || [];

      // BUY LEG: Hold USDC -> Enter RWA Position
      if (rwaBal === 0n && usdcBal >= ethers.parseUnits("5", 6)) {
        const spendAmountUsd = Math.min(allocationUsd, Number(ethers.formatUnits(usdcBal, 6)));
        const spendUnits = ethers.parseUnits(spendAmountUsd.toFixed(6), 6);

        // SLIPPAGE PROTECTION (1% MAX)
        const spendUsdNum = Number(ethers.formatUnits(spendUnits, 6));
        const minTokensOut = (spendUsdNum / livePrice) * 0.99;
        const amountOutMinimum = ethers.parseUnits(minTokensOut.toFixed(6), tokenCfg.decimals);

        const allowance = await usdc.allowance(wallet.address, UNISWAP_V3_ROUTER);
        if (allowance < spendUnits) {
          const approveTx = await usdc.approve(UNISWAP_V3_ROUTER, ethers.MaxUint256);
          await approveTx.wait();
        }

        const tx = await router.exactInputSingle({
          tokenIn: BASE_USDC,
          tokenOut: tokenCfg.address,
          fee: tokenCfg.feeTier,
          recipient: wallet.address,
          amountIn: spendUnits,
          amountOutMinimum: amountOutMinimum,
          sqrtPriceLimitX96: 0
        });
        await tx.wait();

        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: `BUY EXECUTION: Purchased ${symbol} at $${livePrice.toFixed(2)} (Slippage: 1%)`,
          type: "success",
          hash: tx.hash
        });

        await userDoc.ref.update({
          stockEntryPrice: livePrice,
          stockBotLogs: currentLogs.slice(-30)
        });

        results.push({ userId, action: "BUY_RWA", symbol, price: livePrice, txHash: tx.hash });
      }
      // HARVEST LEG: Reached +2.1% profit target
      else if (rwaBal > 0n && entryPrice > 0 && livePrice >= entryPrice * (1 + harvestTarget)) {
        // SLIPPAGE PROTECTION (1% MAX)
        const tokensToSell = Number(ethers.formatUnits(rwaBal, tokenCfg.decimals));
        const minUsdcOut = tokensToSell * livePrice * 0.99;
        const amountOutMinimum = ethers.parseUnits(minUsdcOut.toFixed(6), 6);

        const allowance = await rwaToken.allowance(wallet.address, UNISWAP_V3_ROUTER);
        if (allowance < rwaBal) {
          const approveTx = await rwaToken.approve(UNISWAP_V3_ROUTER, ethers.MaxUint256);
          await approveTx.wait();
        }

        const tx = await router.exactInputSingle({
          tokenIn: tokenCfg.address,
          tokenOut: BASE_USDC,
          fee: tokenCfg.feeTier,
          recipient: wallet.address,
          amountIn: rwaBal,
          amountOutMinimum: amountOutMinimum,
          sqrtPriceLimitX96: 0
        });
        await tx.wait();

        const profitUsd = tokensToSell * (livePrice - entryPrice);

        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: `HARVEST COMPLETE: Yield +${(harvestTarget * 100).toFixed(1)}% secured. Profit: $${profitUsd.toFixed(2)}`,
          type: "success",
          hash: tx.hash
        });

        await userDoc.ref.update({
          stockEntryPrice: 0,
          harvestedStockYield: FieldValue.increment(Math.max(0, profitUsd)),
          stockBotLogs: currentLogs.slice(-30)
        });

        results.push({ userId, action: "HARVEST_RWA", symbol, price: livePrice, txHash: tx.hash });
      } else {
        // SCANNING LOG: Show active monitoring
        const statusMsg = rwaBal > 0n 
          ? `SCANNING: Target $${(entryPrice * (1 + harvestTarget)).toFixed(2)} (Live: $${livePrice.toFixed(2)})`
          : `SCANNING: Waiting for ${symbol} entry (Live: $${livePrice.toFixed(2)})`;
        
        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: statusMsg,
          type: "info"
        });

        await userDoc.ref.update({
          stockBotLogs: currentLogs.slice(-30)
        });
      }
    }

    return NextResponse.json({ status: "ok", processed: results.length, results });
  } catch (err: any) {
    console.error("RWA CRON Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
