import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { ethers } from "ethers";

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  
  // Clean key and parse JSON
  const cleanedKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const serviceAccount = JSON.parse(cleanedKey);

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

function encryptPrivateKey(privateKey: string): string {
  const secret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MASTER_ENCRYPTION_SECRET must be at least 32 characters.");
  }
  // Standard Institutional Enclave Format (AES-256-GCM)
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, privateKey } = await req.json();
    if (!userId || !privateKey) {
      return NextResponse.json({ error: "Missing identity or key payload." }, { status: 400 });
    }

    const formattedKey = privateKey.trim().startsWith("0x")
      ? privateKey.trim()
      : `0x${privateKey.trim()}`;

    // 1. Validate private key and derive real 0x public address
    const wallet = new ethers.Wallet(formattedKey);
    const encryptedPrivateKey = encryptPrivateKey(formattedKey);

    // 2. Provision Enclave in Firestore
    const db = getAdminFirestore();
    await db.collection("userBots").doc(userId).set(
      {
        address: wallet.address,
        encryptedPrivateKey,
        isActive: false,
        targetAsset: "ETH",
        holding: "ASSET",
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, address: wallet.address });
  } catch (err: any) {
    console.error("Enclave Import Error:", err);
    return NextResponse.json(
      { error: "Invalid private key format. Ensure it is a 66-character hex string (0x...)." },
      { status: 400 }
    );
  }
}
