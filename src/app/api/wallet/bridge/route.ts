import { NextRequest, NextResponse } from "next/server";
import * as admin from 'firebase-admin';
import { ethers } from "ethers";
import { decryptUserPrivateKey } from "@/lib/walletVault";

/**
 * Institutional Bridge Provisioning Enclave
 */
if (!admin.apps.length) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      const serviceAccount = JSON.parse(key);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://coinvault-989b4-default-rtdb.firebaseio.com"
      });
    } catch (e: any) {
      console.error("Firebase Admin Init Error (Bridge):", e.message);
    }
  }
}

const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = [
  "function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"
];

export async function POST(req: NextRequest) {
  try {
    const { userId, amountEth } = await req.json();
    if (!userId || !amountEth || Number(amountEth) <= 0) {
      return NextResponse.json({ error: "Invalid userId or ETH amount" }, { status: 400 });
    }

    if (!process.env.MASTER_ENCRYPTION_SECRET) {
      return NextResponse.json({ error: "Enclave Error: MASTER_ENCRYPTION_SECRET missing." }, { status: 500 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ error: "Enclave Error: Admin SDK not initialized." }, { status: 500 });
    }

    const db = admin.firestore();
    const userDoc = await db.collection("userBots").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User bot wallet not found in enclave." }, { status: 404 });
    }

    const botData = userDoc.data()!;
    const privateKey = decryptUserPrivateKey(botData.encryptedPrivateKey);
    const provider = new ethers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");
    const wallet = new ethers.Wallet(privateKey, provider);

    const amountWei = ethers.parseEther(String(amountEth));
    const balanceWei = await provider.getBalance(wallet.address);

    const reserveWei = ethers.parseEther("0.005");
    if (balanceWei < (amountWei + reserveWei)) {
      return NextResponse.json(
        { error: `Insufficient L1 ETH. Balance: ${ethers.formatEther(balanceWei)} ETH.` },
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
    return NextResponse.json({ error: err.message || "Bridge execution failed" }, { status: 500 });
  }
}
