import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createEncryptedUserWallet } from "@/lib/walletVault";

function getAdminFirestore() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env.local");
  }

  // Strip accidental surrounding quotes if present
  const cleanedKey = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const serviceAccount = JSON.parse(cleanedKey);

  // Use a dedicated named app so an earlier default initializeApp() never overrides it
  const existing = getApps().find((app) => app.name === "coinvault-admin");
  const adminApp =
    existing ??
    initializeApp(
      {
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      },
      "coinvault-admin"
    );

  return getFirestore(adminApp);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "defaultUser";

    const db = getAdminFirestore();
    const docRef = db.collection("userBots").doc(userId);
    const snap = await docRef.get();

    // If wallet already exists for this user, return its public address
    if (snap.exists && snap.data()?.address) {
      return NextResponse.json({
        address: snap.data()!.address,
        alreadyExists: true
      });
    }

    // Generate & encrypt a new wallet
    const { address, encryptedPrivateKey } = createEncryptedUserWallet();

    await docRef.set({
      address,
      encryptedPrivateKey,
      isActive: false,
      targetAsset: "ETH",
      holding: "ASSET",
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ address, created: true });
  } catch (err: any) {
    console.error("Wallet creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate trading wallet" },
      { status: 500 }
    );
  }
}
