import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { ethers } from "ethers";

/**
 * Institutional Crypto Alpha Engine
 * Executes autonomous trades for ETH, BTC, and SOL on Base Mainnet.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ASSETS: Record<string, { address: string; decimals: number; oracle: string; feeTier: number }> = {
  ETH: { address: "0x4200000000000000000000000000000000000006", decimals: 18, oracle: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", feeTier: 500 },
  BTC: { address: "0xcbB7C916ABF68b1330b07af079a08F5097474651", decimals: 8, oracle: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F", feeTier: 3000 },
  SOL: { address: "0x2bE4E0fB6997B286E6c6A7606eD4745E67D65191", decimals: 18, oracle: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D", feeTier: 3000 }
};

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

const CHAINLINK_ABI = [
  "function decimals() external view returns (uint8)",
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  const serviceAccount = JSON.parse(rawKey.trim().replace(/^['"]|['"]$/g, ""));
  const existing = getApps().find((app) => app.name === "coinvault-admin");
  const adminApp = existing ?? initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id }, "coinvault-admin");
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

async function getOraclePrice(provider: ethers.Provider, symbol: string) {
  const cfg = ASSETS[symbol];
  if (!cfg) return 0;
  const contract = new ethers.Contract(cfg.oracle, CHAINLINK_ABI, provider);
  const [decimals, roundData] = await Promise.all([contract.decimals(), contract.latestRoundData()]);
  return Number(ethers.formatUnits(roundData.answer, Number(decimals)));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const TARGET_SWING = 0.025; // 2.5% move for crypto swing trades

  try {
    const db = getAdminFirestore();
    const activeBotsSnap = await db.collection("userBots").where("isActive", "==", true).get();

    const results: any[] = [];

    for (const botDoc of activeBotsSnap.docs) {
      const userId = botDoc.id;
      const bot = botDoc.data();
      const symbol = bot.targetAsset || "ETH";
      const assetCfg = ASSETS[symbol];
      if (!assetCfg) continue;

      const userProfileRef = db.collection("users").doc(userId);
      const userProfileSnap = await userProfileRef.get();
      const profileData = userProfileSnap.data() || {};
      let currentLogs = profileData.botLogs || [];

      const kitSnap = await db.collection("users").doc(userId).collection("security").doc("recoveryKit").get();
      if (!kitSnap.exists) continue;

      const mnemonic = decryptMnemonic(kitSnap.data()!.encryptedMnemonic);
      const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
      const livePrice = await getOraclePrice(provider, symbol);

      const usdc = new ethers.Contract(BASE_USDC, ERC20_ABI, wallet);
      const assetToken = new ethers.Contract(assetCfg.address, ERC20_ABI, wallet);
      const router = new ethers.Contract(UNISWAP_V3_ROUTER, ROUTER_ABI, wallet);

      const usdcBal = await usdc.balanceOf(wallet.address);
      const assetBal = await assetToken.balanceOf(wallet.address);

      const lastRef = bot.lastReferencePrice || livePrice;

      // CASE A: HOLDING ASSET -> SELL ON RISE
      if (bot.holding === "ASSET" && assetBal > 0n && livePrice >= lastRef * (1 + TARGET_SWING)) {
        const tokensToSellNum = Number(ethers.formatUnits(assetBal, assetCfg.decimals));
        const minUsdcOut = tokensToSellNum * livePrice * 0.99;
        const amountOutMinimum = ethers.parseUnits(minUsdcOut.toFixed(6), 6);

        const allowance = await assetToken.allowance(wallet.address, UNISWAP_V3_ROUTER);
        if (allowance < assetBal) await (await assetToken.approve(UNISWAP_V3_ROUTER, ethers.MaxUint256)).wait();

        const tx = await router.exactInputSingle({
          tokenIn: assetCfg.address,
          tokenOut: BASE_USDC,
          fee: assetCfg.feeTier,
          recipient: wallet.address,
          amountIn: assetBal,
          amountOutMinimum,
          sqrtPriceLimitX96: 0
        });
        await tx.wait();

        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: `CRYPTO SELL: ${symbol} liquidated at $${livePrice.toFixed(2)} (Slippage: 1%)`,
          type: "success",
          hash: tx.hash
        });

        await botDoc.ref.update({ holding: "USDC", lastReferencePrice: livePrice });
        await userProfileRef.update({ botLogs: currentLogs.slice(-30) });
      }
      // CASE B: HOLDING USDC -> BUY ON DIP
      else if (bot.holding === "USDC" && usdcBal >= ethers.parseUnits("5", 6) && livePrice <= lastRef * (1 - TARGET_SWING)) {
        const spendUsdNum = Number(ethers.formatUnits(usdcBal, 6));
        const minTokensOut = (spendUsdNum / livePrice) * 0.99;
        const amountOutMinimum = ethers.parseUnits(minTokensOut.toFixed(6), assetCfg.decimals);

        const allowance = await usdc.allowance(wallet.address, UNISWAP_V3_ROUTER);
        if (allowance < usdcBal) await (await usdc.approve(UNISWAP_V3_ROUTER, ethers.MaxUint256)).wait();

        const tx = await router.exactInputSingle({
          tokenIn: BASE_USDC,
          tokenOut: assetCfg.address,
          fee: assetCfg.feeTier,
          recipient: wallet.address,
          amountIn: usdcBal,
          amountOutMinimum,
          sqrtPriceLimitX96: 0
        });
        await tx.wait();

        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: `CRYPTO BUY: Swapped USDC for ${symbol} at $${livePrice.toFixed(2)} (Slippage: 1%)`,
          type: "success",
          hash: tx.hash
        });

        await botDoc.ref.update({ holding: "ASSET", lastReferencePrice: livePrice });
        await userProfileRef.update({ botLogs: currentLogs.slice(-30) });
      } else {
        // SCANNING LOG
        const targetLabel = bot.holding === "ASSET" ? "Rise (+2.5%)" : "Dip (-2.5%)";
        currentLogs.push({
          timestamp: new Date().toISOString(),
          msg: `SCANNING: Waiting for ${symbol} ${targetLabel}. Live: $${livePrice.toFixed(2)}`,
          type: "info"
        });
        await userProfileRef.update({ botLogs: currentLogs.slice(-30) });
      }
    }

    return NextResponse.json({ status: "ok", results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
