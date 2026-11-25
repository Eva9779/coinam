import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ethers } from "ethers";
import crypto from "crypto";

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

function getEncryptionKey(): Buffer {
  const secret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MASTER_ENCRYPTION_SECRET must be at least 32 characters.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptText(payload: string): string {
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = [
  "function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"
];

export async function POST(req: NextRequest) {
  try {
    const { userId, amountEth } = await req.json();
    if (!userId || !amountEth || Number(amountEth) <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const kitRef = db.collection("users").doc(userId).collection("security").doc("recoveryKit");
    const snap = await kitRef.get();

    if (!snap.exists || !snap.data()?.encryptedMnemonic) {
      return NextResponse.json({ error: "Recovery Kit not initialized." }, { status: 404 });
    }

    const mnemonic = decryptText(snap.data()!.encryptedMnemonic);
    const provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
    const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

    const amountWei = ethers.parseEther(String(amountEth));
    const balanceWei = await provider.getBalance(wallet.address);

    // Reserve 0.005 ETH for gas fees
    const reserveWei = ethers.parseEther("0.005");
    if (balanceWei < (amountWei + reserveWei)) {
      return NextResponse.json(
        { error: `Insufficient L1 ETH. Balance: ${ethers.formatEther(balanceWei)} ETH. Ensure you have extra for gas.` },
        { status: 400 }
      );
    }

    const bridge = new ethers.Contract(BASE_L1_BRIDGE, BRIDGE_ABI, wallet);
    const tx = await bridge.depositETH(200000, "0x", { value: amountWei });

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      message: "Bridge submitted!"
    });
  } catch (err: any) {
    console.error("Bridge execution error:", err);
    return NextResponse.json({ error: err.message || "Bridge execution failed" }, { status: 500 });
  }
}
