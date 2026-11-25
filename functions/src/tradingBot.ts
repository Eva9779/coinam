import { ethers } from "ethers";

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

const ACTIVE_NET = NETWORKS.BASE_SEPOLIA;

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

function getProviderAndWallet(privateKey: string) {
  const providers = ACTIVE_NET.rpcs.map((url) => new ethers.JsonRpcProvider(url));
  const provider = new ethers.FallbackProvider(providers);
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, wallet };
}

export async function getOnChainEthPrice(provider: ethers.Provider): Promise<number> {
  const pool = new ethers.Contract(ACTIVE_NET.poolEthUsdc, POOL_ABI, provider);
  const { sqrtPriceX96 } = await pool.slot0();
  const priceRatio = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  return priceRatio * 10 ** (18 - 6);
}

export async function swapEthToUsdc(
  privateKey: string,
  ethAmountToSellWei: bigint,
  minExpectedUsdcOut: bigint
) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const currentEthBalance = await provider.getBalance(wallet.address);
  
  if (currentEthBalance - ethAmountToSellWei < SAFETY_CONFIG.MIN_ETH_GAS_RESERVE) {
    throw new Error("Trade blocked: Must keep MIN_ETH_GAS_RESERVE for gas.");
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quotedUsdcOut]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ACTIVE_NET.weth,
    tokenOut: ACTIVE_NET.usdc,
    amountIn: ethAmountToSellWei,
    fee: ACTIVE_NET.poolFee,
    sqrtPriceLimitX96: 0n
  });

  if (quotedUsdcOut < minExpectedUsdcOut) {
    return {
      executed: false,
      reason: `Quoted USDC (${ethers.formatUnits(quotedUsdcOut, 6)}) below target profit floor.`
    };
  }

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
  return {
    executed: true,
    txHash: receipt!.hash,
    usdcReceivedEstimate: ethers.formatUnits(quotedUsdcOut, 6)
  };
}

export async function swapUsdcToEth(
  privateKey: string,
  usdcAmountIn: bigint,
  minExpectedEthOutWei: bigint
) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const usdcContract = new ethers.Contract(ACTIVE_NET.usdc, ERC20_ABI, wallet);

  const usdcBalance: bigint = await usdcContract.balanceOf(wallet.address);
  if (usdcBalance < usdcAmountIn) {
    throw new Error("Insufficient USDC balance for dip buy.");
  }

  const currentAllowance: bigint = await usdcContract.allowance(
    wallet.address,
    ACTIVE_NET.swapRouter02
  );
  if (currentAllowance < usdcAmountIn) {
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

  if (quotedEthOut < minExpectedEthOutWei) {
    return {
      executed: false,
      reason: `Quoted ETH (${ethers.formatEther(quotedEthOut)}) below target accumulation floor.`
    };
  }

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
  return {
    executed: true,
    txHash: receipt!.hash,
    wethReceivedEstimate: ethers.formatEther(quotedEthOut)
  };
}