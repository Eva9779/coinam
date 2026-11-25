import { ethers } from "ethers";

// Official Base L1StandardBridge Proxy Contract on Ethereum Mainnet
const BASE_L1_BRIDGE = "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
const BRIDGE_ABI = [
  "function depositETH(uint32 _minGasLimit, bytes calldata _extraData) external payable"
];

// Paste your private key temporarily below, run once, then delete this file
const PRIVATE_KEY = process.env.TEMP_PK;
if (!PRIVATE_KEY) {
  console.error("Missing TEMP_PK. Run with: TEMP_PK=0xYOUR_KEY node functions/bridgeNow.mjs");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider("https://publicnode.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const bridge = new ethers.Contract(BASE_L1_BRIDGE, BRIDGE_ABI, wallet);

async function run() {
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet:", wallet.address);
  console.log("Current Ethereum Mainnet ETH:", ethers.formatEther(balance));

  // Bridge 0.0105 ETH (~$17.50) and leave ~0.0015 ETH (~$2.50) for L1 gas fee
  const amountToBridge = ethers.parseEther("0.0105");
  const minGasLimit = 200000;

  console.log("Sending depositETH() directly to Base L1 Bridge...");
  const tx = await bridge.depositETH(minGasLimit, "0x", {
    value: amountToBridge
  });

  console.log("Transaction Hash:", tx.hash);
  console.log("Track on Etherscan: https://etherscan.io/tx/" + tx.hash);

  await tx.wait();
  console.log("CONFIRMED on Ethereum! Your ETH will appear on basescan.org in 2-5 minutes.");
}

run().catch(console.error);
