'use server';

import { ethers } from 'ethers';
import { CHAINS } from './blockchain';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Backend Trading Bot Module (ethers v6)
 * SECURITY: Private keys are never exposed to the client.
 */

const ACTIVE_CHAIN = CHAINS.BASE_SEPOLIA;

export async function executeBotStrategy(userId: string, strategy: any) {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("CRITICAL: WALLET_PRIVATE_KEY not configured in backend.");
    return { success: false, error: "Backend identity not configured." };
  }

  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  const { firestore } = initializeFirebase();

  try {
    // 1. Perform Strategy Pre-flight
    const balance = await provider.getBalance(wallet.address);
    if (balance < ethers.parseEther("0.001")) {
      throw new Error("Insufficient gas for strategy execution.");
    }

    // 2. Execute Real On-Chain Action
    // For this prototype, we perform a "Strategy Heartbeat" (self-transfer) 
    // to prove connectivity and log real tx hashes.
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0, // Heartbeat
      data: ethers.hexlify(ethers.toUtf8Bytes(`CoinAM_${strategy.type || 'Standard'}`))
    });

    const receipt = await tx.wait();

    // 3. Log Real Hash to Firestore
    const logEntry = {
      msg: `Strategy executed: ${strategy.type}. TX: ${tx.hash}`,
      type: 'success',
      timestamp: new Date().toISOString(),
      hash: tx.hash
    };

    await updateDoc(doc(firestore, 'users', userId), {
      botLogs: arrayUnion(logEntry),
      totalBotEarnings: strategy.mockEarnings ? strategy.mockEarnings : 0 // Still return value if requested
    });

    return { success: true, hash: tx.hash };
  } catch (error: any) {
    console.error("Bot Execution Failed:", error.message);
    
    await updateDoc(doc(firestore, 'users', userId), {
      botLogs: arrayUnion({
        msg: `Execution Error: ${error.message}`,
        type: 'error',
        timestamp: new Date().toISOString()
      })
    });

    return { success: false, error: error.message };
  }
}
