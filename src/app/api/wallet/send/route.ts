import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { ethers } from "ethers";
import { decryptUserPrivateKey } from "@/lib/walletVault";

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  const serviceAccount = JSON.parse(rawKey.trim().replace(/^['"]|['"]$/g, ""));

  const existing = getApps().find((app) => app.name === "coinvault-admin");
  const adminApp =
    existing ??
    initializeApp(
      { 
        credential: cert(serviceAccount), 
        projectId: serviceAccount.project_id,
        databaseURL: "https://coinvault-989b4-default-rtdb.firebaseio.com"
      },
      "coinvault-admin"
    );

  return getFirestore(adminApp);
}

const NETWORKS = {
  ETHEREUM: {
    rpc: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io/tx/"
  },
  BASE: {
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org/tx/"
  }
};

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export async function POST(req: NextRequest) {
  try {
    const { userId, asset, toAddress, amount } = await req.json();

    if (!userId || !asset || !toAddress || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Missing or invalid transfer details." }, { status: 400 });
    }
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: "Invalid destination 0x wallet address." }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userDoc = await db.collection("userBots").doc(userId).get();
    if (!userDoc.exists || !userDoc.data()?.encryptedPrivateKey) {
      return NextResponse.json({ error: "User wallet not initialized." }, { status: 404 });
    }

    const privateKey = decryptUserPrivateKey(userDoc.data()!.encryptedPrivateKey);

    let txHash = "";
    let explorerUrl = "";

    if (asset === "ETH_MAINNET") {
      const provider = new ethers.JsonRpcProvider(NETWORKS.ETHEREUM.rpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      const valueWei = ethers.parseEther(String(amount));
      const tx = await wallet.sendTransaction({ to: toAddress, value: valueWei });
      txHash = tx.hash;
      explorerUrl = `${NETWORKS.ETHEREUM.explorer}${txHash}`;
    }
    else if (asset === "ETH_BASE") {
      const provider = new ethers.JsonRpcProvider(NETWORKS.BASE.rpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      const valueWei = ethers.parseEther(String(amount));
      const tx = await wallet.sendTransaction({ to: toAddress, value: valueWei });
      txHash = tx.hash;
      explorerUrl = `${NETWORKS.BASE.explorer}${txHash}`;
    }
    else if (asset === "USDC_BASE") {
      const provider = new ethers.JsonRpcProvider(NETWORKS.BASE.rpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      const usdc = new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, wallet);
      const amountUnits = ethers.parseUnits(String(amount), 6);
      const tx = await usdc.transfer(toAddress, amountUnits);
      txHash = tx.hash;
      explorerUrl = `${NETWORKS.BASE.explorer}${txHash}`;
    } else {
      return NextResponse.json({ error: "Unsupported asset selection." }, { status: 400 });
    }

    await db
      .collection("userBots")
      .doc(userId)
      .collection("transfers")
      .add({
        asset,
        toAddress,
        amount: String(amount),
        txHash,
        explorerUrl,
        timestamp: FieldValue.serverTimestamp()
      });

    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl
    });
  } catch (err: any) {
    console.error("On-chain send error:", err);
    return NextResponse.json(
      { error: err.shortMessage || err.message || "Broadcast failed." },
      { status: 500 }
    );
  }
}