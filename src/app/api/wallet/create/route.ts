import { NextResponse } from "next/server";
import { createEncryptedUserWallet } from "@/lib/walletVault";
import * as admin from 'firebase-admin';

/**
 * Institutional Wallet Provisioning Enclave
 * Initializes the Admin SDK with explicit credentials to prevent "non-existent access token" errors.
 */
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing identity context (UID)" }, { status: 401 });

    if (!process.env.MASTER_ENCRYPTION_SECRET) {
      return NextResponse.json({ error: "Enclave Error: MASTER_ENCRYPTION_SECRET is not configured." }, { status: 500 });
    }

    const botRef = db.collection("userBots").doc(userId);
    const snap = await botRef.get();

    if (snap.exists) {
      return NextResponse.json({ 
        address: snap.data()?.address,
        message: "Bot wallet already provisioned for this identity." 
      });
    }

    // Generate per-user non-custodial endpoint
    const { address, encryptedPrivateKey } = createEncryptedUserWallet();

    await botRef.set({
      userId,
      address,
      encryptedPrivateKey,
      isActive: false,
      targetAsset: "ETH",
      holding: "ASSET",
      lastReferencePrice: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ address, success: true });
  } catch (error: any) {
    console.error("Provisioning API Error:", error);
    return NextResponse.json({ error: `Provisioning Failed: ${error.message}` }, { status: 500 });
  }
}
