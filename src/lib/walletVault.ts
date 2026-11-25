import crypto from "crypto";
import { ethers } from "ethers";

const ALGO = "aes-256-gcm";

function getMasterKey(): Buffer {
  const secret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SECURITY_ENCLAVE_ERROR: MASTER_ENCRYPTION_SECRET is missing or too short (min 32 chars). Add it to your .env file.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Institutional Secure Enclave Wallet Generator
 * Creates a new wallet and encrypts its private key using the Master Secret.
 */
export function createEncryptedUserWallet() {
  const wallet = ethers.Wallet.createRandom();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(wallet.privateKey, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    address: wallet.address,
    encryptedPrivateKey: `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
  };
}

/**
 * Just-In-Time Decryption
 * Decrypts a user's private key for transaction signing.
 */
export function decryptUserPrivateKey(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("ENCLAVE_FORMAT_ERROR: Invalid encrypted key payload.");
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const decipher = crypto.createDecipheriv(
    ALGO,
    getMasterKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
