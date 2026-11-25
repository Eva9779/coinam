'use server';

import { ethers } from 'ethers';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Backend Trading Bot Module (ethers v6)
 * SECURITY: Private keys are never exposed to the client.
 * Uses Uniswap V3 on Base Network for atomic P2P swaps.
 */

// ============================================================================
// 1. NETWORK & CONTRACT CONFIGURATION
// ============================================================================
const NETWORKS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    rpcs: [
      "https://sepolia.base.org",
      "https://publicnode.com"
    ],
    swapRouter02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
    quoterV2: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27",
    poolEthUsdc: "0x0FB597D6AeE439F5743E63C9B2A8B6b6E3cB8D52",
    weth: "0x4200000000000000000000000000000000000006",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    poolFee: 500 
  },
  BASE_MAINNET: {
    chainId: 8453,
    rpcs: [
      "https://mainnet.base.org",
      "https://publicnode.com",
      "https://1rpc.io"
    ],
    swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    poolEthUsdc: "0xd0b53D9277642d899DF5C87A3966A349A798F224",
    weth: "0x4200000000000000000000000000000000000006",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    poolFee: 500
  }
};

const ACTIVE_NET = NETWORKS.BASE_MAINNET;

const SAFETY_CONFIG = {
  MIN_ETH_GAS_RESERVE: ethers.parseEther("0.0015"),
  SLIPPAGE_BPS: 100n 
};

// ============================================================================
// 2. ABIs
// ============================================================================
const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// ============================================================================
// 3. INTERNAL HELPERS
// ============================================================================

function getProviderAndWallet(privateKey: string) {
  const providers = ACTIVE_NET.rpcs.map((url) => new ethers.JsonRpcProvider(url));
  const provider = new ethers.FallbackProvider(providers);
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, wallet };
}

async function performSwapEthToUsdc(privateKey: string, ethAmountToSellWei: bigint) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const currentEthBalance = await provider.getBalance(wallet.address);
  
  if (currentEthBalance - ethAmountToSellWei < SAFETY_CONFIG.MIN_ETH_GAS_RESERVE) {
    throw new Error("Gas reserve violation: Must keep MIN_ETH_GAS_RESERVE for gas.");
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quotedUsdcOut]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ACTIVE_NET.weth,
    tokenOut: ACTIVE_NET.usdc,
    amountIn: ethAmountToSellWei,
    fee: ACTIVE_NET.poolFee,
    sqrtPriceLimitX96: 0n
  });

  const amountOutMinimum = (quotedUsdcOut * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n;
  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);
  
  const tx = await router.exactInputSingle(
    {
      tokenIn: ACTIVE_NET.weth,
      tokenOut: ACTIVE_NET.usdc,
      fee: ACTIVE_NET.poolFee,
      recipient: wallet.address,
      amountIn: ethAmountToSellWei,
      amountOutMinimum,
      sqrtPriceLimitX96: 0n
    },
    { value: ethAmountToSellWei }
  );

  const receipt = await tx.wait();
  return { hash: receipt!.hash, amountOut: ethers.formatUnits(quotedUsdcOut, 6) };
}

async function performSwapUsdcToEth(privateKey: string, usdcAmountIn: bigint) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const usdcContract = new ethers.Contract(ACTIVE_NET.usdc, ERC20_ABI, wallet);
  
  const currentBalance: bigint = await usdcContract.balanceOf(wallet.address);
  if (currentBalance < usdcAmountIn) throw new Error("Insufficient USDC for swap.");

  const allowance: bigint = await usdcContract.allowance(wallet.address, ACTIVE_NET.swapRouter02);
  if (allowance < usdcAmountIn) {
    const approveTx = await usdcContract.approve(ACTIVE_NET.swapRouter02, usdcAmountIn);
    await approveTx.wait();
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quotedEthOut]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ACTIVE_NET.usdc,
    tokenOut: ACTIVE_NET.weth,
    amountIn: usdcAmountIn,
    fee: ACTIVE_NET.poolFee,
    sqrtPriceLimitX96: 0n
  });

  const amountOutMinimum = (quotedEthOut * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n;
  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);

  const tx = await router.exactInputSingle({
    tokenIn: ACTIVE_NET.usdc,
    tokenOut: ACTIVE_NET.weth,
    fee: ACTIVE_NET.poolFee,
    recipient: wallet.address,
    amountIn: usdcAmountIn,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n
  });

  const receipt = await tx.wait();
  return { hash: receipt!.hash, amountOut: ethers.formatEther(quotedEthOut) };
}

// ============================================================================
// 4. PUBLIC EXECUTION INTERFACE
// ============================================================================

export async function executeBotStrategy(userId: string, strategy: any) {
  // SECURE: Only load private key on the server
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) return { success: false, error: "Backend identity not configured (WALLET_PRIVATE_KEY)." };

  const { firestore } = initializeFirebase();

  try {
    const action = strategy.actions?.find((a: any) => a.type !== 'hold');
    if (!action) {
      return { success: true, message: "Strategic hold maintained." };
    }

    let result;
    if (action.type === 'sell' && (action.asset === 'ETH' || action.fromAsset === 'ETH')) {
      const amountWei = ethers.parseEther(action.amount?.toString() || (action.amountUSD / 2500).toString());
      result = await performSwapEthToUsdc(privateKey, amountWei);
    } else if (action.type === 'buy' && (action.asset === 'ETH' || action.toAsset === 'ETH')) {
      const amountUsdc = ethers.parseUnits(action.amountUSD?.toString() || action.amount?.toString(), 6);
      result = await performSwapUsdcToEth(privateKey, amountUsdc);
    }

    if (result) {
      const logEntry = {
        msg: `Mainnet Trade Executed: ${action.type} ${action.asset || 'ETH'}. Received: ${result.amountOut}.`,
        type: 'success',
        timestamp: new Date().toISOString(),
        hash: result.hash
      };

      await updateDoc(doc(firestore, 'users', userId), {
        botLogs: arrayUnion(logEntry)
      });

      return { success: true, hash: result.hash };
    }

    return { success: false, error: "Unsupported strategy action format." };
  } catch (error: any) {
    console.error('Trading Engine Error:', error.message);
    
    await updateDoc(doc(firestore, 'users', userId), {
      botLogs: arrayUnion({
        msg: `Network Error: ${error.message}`,
        type: 'error',
        timestamp: new Date().toISOString()
      })
    });
    
    return { success: false, error: error.message };
  }
}
