import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { generateMnemonic, english, mnemonicToAccount } from "viem/accounts";

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

function getEncryptionKey(): Buffer {
  const secret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MASTER_ENCRYPTION_SECRET must be at least 32 characters.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const kitRef = db.collection("users").doc(userId).collection("security").doc("recoveryKit");
    const snap = await kitRef.get();

    // Never overwrite an existing wallet — always return the saved one
    if (snap.exists && snap.data()?.encryptedMnemonic) {
      const data = snap.data()!;
      const mnemonic = decryptText(data.encryptedMnemonic);
      return NextResponse.json({
        address: data.address,
        mnemonic,
        existing: true
      });
    }

    // Generate a brand-new real 12-word BIP-39 recovery phrase
    const mnemonic = generateMnemonic(english);
    const account = mnemonicToAccount(mnemonic);
    const encryptedMnemonic = encryptText(mnemonic);

    await kitRef.set({
      address: account.address,
      encryptedMnemonic,
      createdAt: FieldValue.serverTimestamp()
    });

    // Also store the public address on the user's primary asset doc (never overwrite if funded)
    await db
      .collection("users")
      .doc(userId)
      .collection("assets")
      .doc("primary-vault-eth")
      .set(
        {
          currency: "ETH",
          address: account.address,
          isPrimary: true,
          isLive: true
        },
        { merge: true }
      );

    return NextResponse.json({
      address: account.address,
      mnemonic,
      created: true
    });
  } catch (err: any) {
    console.error("Recovery kit error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load recovery kit" },
      { status: 500 }
    );
  }
}