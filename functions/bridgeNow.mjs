import { ethers } from "ethers";

/**
 * Institutional L1 -> L2 Bridge Utility
 * This script interacts directly with the official Base L1 Standard Bridge on Ethereum Mainnet.
 */

// Official Base L1StandardBridge Proxy Contract on Ethereum Mainnet
const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = [
  "function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"
];

// Security: Load private key from temporary environment variable
const PRIVATE_KEY = process.env.TEMP_PK;
if (!PRIVATE_KEY) {
  console.error("ERROR: Missing TEMP_PK environment variable.");
  console.log("Execute with: TEMP_PK=0xYOUR_PRIVATE_KEY node functions/bridgeNow.mjs");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider("https://publicnode.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const bridge = new ethers.Contract(BASE_L1_BRIDGE, BRIDGE_ABI, wallet);

async function run() {
  const balance = await provider.getBalance(wallet.address);
  console.log("----------------------------------------------------------------");
  console.log("INSTITUTIONAL BRIDGE INITIALIZED");
  console.log("Wallet Address:", wallet.address);
  console.log("Ethereum Mainnet Balance:", ethers.formatEther(balance), "ETH");
  console.log("----------------------------------------------------------------");

  // Bridge 0.0105 ETH (~$25) and leave a buffer for L1 gas
  const amountToBridge = ethers.parseEther("0.0105");
  
  if (balance < amountToBridge) {
    throw new Error("Insufficient L1 balance to cover bridge amount + gas.");
  }

  const minGasLimit = 200000;

  console.log(`Sending ${ethers.formatEther(amountToBridge)} ETH to Base L1 Bridge...`);
  const tx = await bridge.depositETH(minGasLimit, "0x", {
    value: amountToBridge
  });

  console.log("Transaction Broadcast Success.");
  console.log("Transaction Hash:", tx.hash);
  console.log("Track on Etherscan: https://etherscan.io/tx/" + tx.hash);

  console.log("Waiting for block confirmation...");
  await tx.wait();
  
  console.log("----------------------------------------------------------------");
  console.log("CONFIRMED: Deposit successfully locked on Ethereum.");
  console.log("Your ETH will be minted on Base Mainnet in approximately 3-5 minutes.");
  console.log("Check arrival at: https://basescan.org/address/" + wallet.address);
  console.log("----------------------------------------------------------------");
}

run().catch((error) => {
  console.error("BRIDGE FAILURE:", error.message);
  process.exit(1);
});
