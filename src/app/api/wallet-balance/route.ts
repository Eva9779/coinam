import { NextResponse } from "next/server";
import { ethers } from "ethers";

const WALLET_ADDRESS = "0xeb585480Cd9edA87f26C281C48B84958aEb090ec";
const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://1rpc.io"
];
const ETH_RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com"
];

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_ETH_USDC_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

export const dynamic = "force-dynamic";

export async function GET() {
  let baseEth = "0.000000";
  let mainnetEth = "0.000000";
  let usdcBalance = "0.00";
  let ethPriceUsd = 0;

  // 1. Fetch Base Data (ETH, USDC, Price)
  for (const rpcUrl of BASE_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const [rawEthWei, rawUsdc, slot0] = await Promise.all([
        provider.getBalance(WALLET_ADDRESS),
        new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, provider).balanceOf(WALLET_ADDRESS),
        new ethers.Contract(UNISWAP_ETH_USDC_POOL, POOL_ABI, provider).slot0()
      ]);

      baseEth = ethers.formatEther(rawEthWei);
      usdcBalance = ethers.formatUnits(rawUsdc, 6);
      
      const priceRatio = (Number(slot0.sqrtPriceX96) / 2 ** 96) ** 2;
      ethPriceUsd = priceRatio * 10 ** (18 - 6);
      break;
    } catch (error) {
      console.warn(`Base RPC ${rpcUrl} failed, trying next...`);
    }
  }

  // 2. Fetch Ethereum Mainnet Data
  for (const rpcUrl of ETH_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const rawEthWei = await provider.getBalance(WALLET_ADDRESS);
      mainnetEth = ethers.formatEther(rawEthWei);
      break;
    } catch (error) {
      console.warn(`Ethereum RPC ${rpcUrl} failed, trying next...`);
    }
  }

  return NextResponse.json({
    baseEth: Number(baseEth).toFixed(6),
    mainnetEth: Number(mainnetEth).toFixed(6),
    usdcBalance: Number(usdcBalance).toFixed(2),
    ethPriceUsd: ethPriceUsd
  });
}
