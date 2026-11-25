import { NextResponse } from "next/server";
import { ethers } from "ethers";

const WALLET_ADDRESS = "0xeb585480Cd9edA87f26C281C48B84958aEb090ec";
const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://publicnode.com",
  "https://1rpc.io"
];
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_ETH_USDC_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

export const dynamic = "force-dynamic";

export async function GET() {
  for (const rpcUrl of BASE_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, 8453, {
        staticNetwork: true
      });

      // Fetch all required data in parallel for speed
      const [rawEthWei, rawUsdc, slot0] = await Promise.all([
        provider.getBalance(WALLET_ADDRESS),
        new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, provider).balanceOf(
          WALLET_ADDRESS
        ),
        new ethers.Contract(UNISWAP_ETH_USDC_POOL, POOL_ABI, provider).slot0()
      ]);

      const formattedEth = ethers.formatEther(rawEthWei);
      const formattedUsdc = ethers.formatUnits(rawUsdc, 6);
      
      // Uniswap V3 Price Calculation
      const priceRatio = (Number(slot0.sqrtPriceX96) / 2 ** 96) ** 2;
      const liveEthUsd = priceRatio * 10 ** (18 - 6);

      return NextResponse.json({
        ethBalance: Number(formattedEth).toFixed(6),
        usdcBalance: Number(formattedUsdc).toFixed(2),
        ethPriceUsd: liveEthUsd
      });
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`);
      // Automatically try the next RPC if one is busy or fails
    }
  }

  return NextResponse.json(
    { error: "All Base RPC endpoints failed to respond." },
    { status: 502 }
  );
}
