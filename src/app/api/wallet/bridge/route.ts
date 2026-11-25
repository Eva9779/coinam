import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";
import { ethers } from "ethers";

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
  const secret = process.env.MASTER_ENCRYPTION_SECRET!;
  const key = crypto.createHash("sha256").update(secret).digest();
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = ["function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"];

export async function POST(req: NextRequest) {
  try {
    const { userId, amountEth } = await req.json();
    if (!userId || !amountEth || Number(amountEth) <= 0) {
      return NextResponse.json({ error: "Invalid userId or ETH amount." }, { status: 400 });
    }

    const db = getAdminFirestore();
    const kitSnap = await db.collection("users").doc(userId).collection("security").doc("recoveryKit").get();
    if (!kitSnap.exists || !kitSnap.data()?.encryptedMnemonic) {
      return NextResponse.json({ error: "Wallet recovery kit not found." }, { status: 404 });
    }

    const mnemonic = decryptMnemonic(kitSnap.data()!.encryptedMnemonic);
    const provider = new ethers.JsonRpcProvider("https://publicnode.com");
    const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

    const amountWei = ethers.parseEther(String(amountEth));
    const balanceWei = await provider.getBalance(wallet.address);
    if (balanceWei <= amountWei) {
      return NextResponse.json({ error: "Insufficient Ethereum Mainnet ETH to cover amount + gas." }, { status: 400 });
    }

    const bridge = new ethers.Contract(BASE_L1_BRIDGE, BRIDGE_ABI, wallet);
    const tx = await bridge.depositETH(200000, "0x", { value: amountWei });

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      message: "Bridge sent! ETH arrives on Base Mainnet in ~3 minutes."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.shortMessage || err.message || "Bridge failed." }, { status: 500 });
  }
}