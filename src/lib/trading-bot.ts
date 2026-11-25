import { ethers } from 'ethers';

/**
 * Backend Trading Bot Module (ethers v6)
 * Handles precision execution for ETH, BTC, and SOL on Base Mainnet.
 * Note: This file is for server-side logic and utility functions.
 */

export type TradableAsset = "ETH" | "BTC" | "SOL";

export const ASSETS: Record<TradableAsset, { tokenAddress: string; decimals: number; oracle: string }> = {
  ETH: { 
    tokenAddress: "0x4200000000000000000000000000000000000006", 
    decimals: 18,
    oracle: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"
  },
  BTC: { 
    tokenAddress: "0xcbB7C916ABF68b1330b07af079a08F5097474651", 
    decimals: 8,
    oracle: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F"
  },
  SOL: { 
    tokenAddress: "0x2bE4E0fB6997B286E6c6A7606eD4745E67D65191", 
    decimals: 18,
    oracle: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D"
  }
};

const NETWORKS = {
  BASE_MAINNET: {
    chainId: 8453,
    rpcs: ["https://mainnet.base.org", "https://publicnode.com"],
    swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    poolFee: 500
  }
};

const ACTIVE_NET = NETWORKS.BASE_MAINNET;
const SAFETY_CONFIG = {
  MIN_ETH_GAS_RESERVE: ethers.parseEther("0.0015"),
  SLIPPAGE_BPS: 100n 
};

const CHAINLINK_ABI = [
  "function decimals() external view returns (uint8)",
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
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

export async function getAssetOraclePrice(provider: ethers.Provider, symbol: TradableAsset): Promise<number> {
  const address = ASSETS[symbol].oracle;
  const contract = new ethers.Contract(address, CHAINLINK_ABI, provider);
  const [decimals, roundData] = await Promise.all([
    contract.decimals(),
    contract.latestRoundData()
  ]);
  return Number(ethers.formatUnits(roundData.answer, Number(decimals)));
}

export async function sellAssetForUsdc(
  privateKey: string,
  symbol: TradableAsset,
  amountIn: bigint,
  minExpectedUsdcOut: bigint
) {
  const provider = new ethers.JsonRpcProvider(ACTIVE_NET.rpcs[0]);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tokenIn = ASSETS[symbol].tokenAddress;
  
  if (symbol === "ETH") {
    const bal = await provider.getBalance(wallet.address);
    if (bal - amountIn < SAFETY_CONFIG.MIN_ETH_GAS_RESERVE) return { executed: false, error: "Gas reserve low." };
  } else {
    const contract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const allowance: bigint = await contract.allowance(wallet.address, ACTIVE_NET.swapRouter02);
    if (allowance < amountIn) {
      const tx = await contract.approve(ACTIVE_NET.swapRouter02, amountIn);
      await tx.wait();
    }
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quoted]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn, tokenOut: ACTIVE_NET.tokens.USDC, amountIn, fee: ACTIVE_NET.poolFee, sqrtPriceLimitX96: 0n
  });

  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);
  const tx = await router.exactInputSingle(
    { 
      tokenIn, 
      tokenOut: ACTIVE_NET.tokens.USDC, 
      fee: ACTIVE_NET.poolFee, 
      recipient: wallet.address, 
      amountIn, 
      amountOutMinimum: (quoted * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n, 
      sqrtPriceLimitX96: 0n 
    },
    symbol === "ETH" ? { value: amountIn } : {}
  );

  const rec = await tx.wait();
  return { 
    executed: true, 
    txHash: rec!.hash, 
    usdcReceived: ethers.formatUnits(quoted, 6) 
  };
}

export async function buyAssetWithUsdc(
  privateKey: string,
  symbol: TradableAsset,
  usdcAmountIn: bigint,
  minExpectedAssetOut: bigint
) {
  const provider = new ethers.JsonRpcProvider(ACTIVE_NET.rpcs[0]);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tokenOut = ASSETS[symbol].tokenAddress;
  const usdc = new ethers.Contract(ACTIVE_NET.tokens.USDC, ERC20_ABI, wallet);

  const allowance: bigint = await usdc.allowance(wallet.address, ACTIVE_NET.swapRouter02);
  if (allowance < usdcAmountIn) {
    const tx = await usdc.approve(ACTIVE_NET.swapRouter02, usdcAmountIn);
    await tx.wait();
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quoted]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ACTIVE_NET.tokens.USDC, tokenOut, amountIn: usdcAmountIn, fee: ACTIVE_NET.poolFee, sqrtPriceLimitX96: 0n
  });

  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);
  const tx = await router.exactInputSingle({
    tokenIn: ACTIVE_NET.tokens.USDC, 
    tokenOut, 
    fee: ACTIVE_NET.poolFee, 
    recipient: wallet.address, 
    amountIn: usdcAmountIn, 
    amountOutMinimum: (quoted * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n, 
    sqrtPriceLimitX96: 0n
  });

  const rec = await tx.wait();
  return { 
    executed: true, 
    txHash: rec!.hash, 
    amountReceived: ethers.formatUnits(quoted, ASSETS[symbol].decimals) 
  };
}

/**
 * DEPRECATED: executeBotStrategy is now handled by the Multi-User Cron Engine.
 */
export async function executeBotStrategy(userId: string, strategy: any) {
  return { success: false, error: "Legacy endpoint. Please use the Multi-User Protocol." };
}
