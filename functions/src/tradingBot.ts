import { ethers } from "ethers";

const NETWORKS = {
  BASE_MAINNET: {
    chainId: 8453,
    rpcs: ["https://mainnet.base.org", "https://publicnode.com"],
    swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
    quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    tokens: {
      ETH: "0x4200000000000000000000000000000000000006",
      BTC: "0xcbB7C916ABF68b1330b07af079a08F5097474651", // cbBTC
      SOL: "0x2bE4E0fB6997B286E6c6A7606eD4745E67D65191", // Wormhole SOL
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    oracles: {
      ETH: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      BTC: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
      SOL: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D"
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

function getProviderAndWallet(privateKey: string) {
  const providers = ACTIVE_NET.rpcs.map((url) => new ethers.JsonRpcProvider(url));
  const provider = new ethers.FallbackProvider(providers);
  return { provider, wallet: new ethers.Wallet(privateKey, provider) };
}

export async function getAssetOraclePrice(provider: ethers.Provider, symbol: string): Promise<number> {
  const address = ACTIVE_NET.oracles[symbol as keyof typeof ACTIVE_NET.oracles];
  const contract = new ethers.Contract(address, CHAINLINK_ABI, provider);
  const [decimals, roundData] = await Promise.all([
    contract.decimals(),
    contract.latestRoundData()
  ]);
  return Number(ethers.formatUnits(roundData.answer, Number(decimals)));
}

export async function swapAssetToUsdc(
  privateKey: string,
  symbol: string,
  amountIn: bigint,
  minExpectedUsdcOut: bigint
) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const tokenIn = ACTIVE_NET.tokens[symbol as keyof typeof ACTIVE_NET.tokens];
  
  if (symbol === "ETH") {
    const bal = await provider.getBalance(wallet.address);
    if (bal - amountIn < SAFETY_CONFIG.MIN_ETH_GAS_RESERVE) throw new Error("Gas reserve low.");
  } else {
    const contract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const allowance: bigint = await contract.allowance(wallet.address, ACTIVE_NET.swapRouter02);
    if (allowance < amountIn) await (await contract.approve(ACTIVE_NET.swapRouter02, amountIn)).wait();
  }

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quoted]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn, tokenOut: ACTIVE_NET.tokens.USDC, amountIn, fee: ACTIVE_NET.poolFee, sqrtPriceLimitX96: 0n
  });

  if (quoted < minExpectedUsdcOut) return { executed: false, reason: "Below floor." };

  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);
  const tx = await router.exactInputSingle(
    { tokenIn, tokenOut: ACTIVE_NET.tokens.USDC, fee: ACTIVE_NET.poolFee, recipient: wallet.address, amountIn, amountOutMinimum: (quoted * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n, sqrtPriceLimitX96: 0n },
    symbol === "ETH" ? { value: amountIn } : {}
  );

  const rec = await tx.wait();
  return { executed: true, txHash: rec.hash, usdcReceivedEstimate: ethers.formatUnits(quoted, 6) };
}

export async function swapUsdcToAsset(
  privateKey: string,
  symbol: string,
  usdcAmountIn: bigint,
  minExpectedAssetOut: bigint
) {
  const { provider, wallet } = getProviderAndWallet(privateKey);
  const tokenOut = ACTIVE_NET.tokens[symbol as keyof typeof ACTIVE_NET.tokens];
  const usdc = new ethers.Contract(ACTIVE_NET.tokens.USDC, ERC20_ABI, wallet);

  const allowance: bigint = await usdc.allowance(wallet.address, ACTIVE_NET.swapRouter02);
  if (allowance < usdcAmountIn) await (await usdc.approve(ACTIVE_NET.swapRouter02, usdcAmountIn)).wait();

  const quoter = new ethers.Contract(ACTIVE_NET.quoterV2, QUOTER_ABI, provider);
  const [quoted]: [bigint] = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: ACTIVE_NET.tokens.USDC, tokenOut, amountIn: usdcAmountIn, fee: ACTIVE_NET.poolFee, sqrtPriceLimitX96: 0n
  });

  if (quoted < minExpectedAssetOut) return { executed: false, reason: "Below floor." };

  const router = new ethers.Contract(ACTIVE_NET.swapRouter02, ROUTER_ABI, wallet);
  const tx = await router.exactInputSingle({
    tokenIn: ACTIVE_NET.tokens.USDC, tokenOut, fee: ACTIVE_NET.poolFee, recipient: wallet.address, amountIn: usdcAmountIn, amountOutMinimum: (quoted * (10000n - SAFETY_CONFIG.SLIPPAGE_BPS)) / 10000n, sqrtPriceLimitX96: 0n
  });

  const rec = await tx.wait();
  return { executed: true, txHash: rec.hash, assetReceivedEstimate: ethers.formatUnits(quoted, symbol === "BTC" ? 8 : 18) };
}
