import { NextResponse } from "next/server";
import { createEncryptedUserWallet } from "@/lib/walletVault";
import * as admin from 'firebase-admin';

// Initialize Admin SDK for secure write access
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing UID" }, { status: 401 });

    const botRef = db.collection("userBots").doc(userId);
    const snap = await botRef.get();

    if (snap.exists) {
      return NextResponse.json({ 
        address: snap.data()?.address,
        message: "Bot wallet already provisioned." 
      });
    }

    const { address, encryptedPrivateKey } = createEncryptedUserWallet();

    await botRef.set({
      userId,
      address,
      encryptedPrivateKey,
      isActive: false,
      targetAsset: "ETH",
      holding: "ASSET",
      lastReferencePrice: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ address, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}