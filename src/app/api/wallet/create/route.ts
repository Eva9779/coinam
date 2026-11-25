import { NextResponse } from "next/server";
import { createEncryptedUserWallet } from "@/lib/walletVault";
import * as admin from 'firebase-admin';

/**
 * Institutional Wallet Provisioning Enclave
 * Explicitly initializes Admin SDK with Service Account credentials.
 */
if (!admin.apps.length) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error("CRITICAL_SECURITY_ERROR: FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment.");
  } else {
    try {
      const serviceAccount = JSON.parse(key);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://coinvault-989b4-default-rtdb.firebaseio.com"
      });
    } catch (e: any) {
      console.error("Firebase Admin Parse Error:", e.message);
    }
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing identity context (UID)" }, { status: 401 });

    if (!process.env.MASTER_ENCRYPTION_SECRET) {
      return NextResponse.json({ 
        error: "ENCLAVE_ERROR: MASTER_ENCRYPTION_SECRET is not configured." 
      }, { status: 500 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ 
        error: "ENCLAVE_ERROR: Firebase Admin failed to initialize. Check SERVICE_ACCOUNT_KEY." 
      }, { status: 500 });
    }

    const db = admin.firestore();
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
