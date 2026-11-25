import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://publicnode.com",
  "https://1rpc.io"
];

const CHAINLINK_ABI = [
  "function decimals() external view returns (uint8)",
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

// Official Chainlink Price Feeds on Base Mainnet
const CRYPTO_FEEDS = [
  { ticker: "BTC", address: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F" },
  { ticker: "ETH", address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" },
  { ticker: "SOL", address: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D" }
];

const RWA_FEEDS = [
  { ticker: "XAU (GOLD)", address: "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6" },
  { ticker: "EUR / USD", address: "0xc91D87E81faB8f93699ECf7Ee9B44D11e1D53F0F" },
  { ticker: "BTC / ETH", address: "0x5903025596614677829020263452081068180000" }
];

export const dynamic = "force-dynamic";

async function readChainlinkFeed(
  provider: ethers.JsonRpcProvider,
  feed: { ticker: string; address: string }
) {
  const contract = new ethers.Contract(feed.address, CHAINLINK_ABI, provider);
  const [decimals, roundData] = await Promise.all([
    contract.decimals(),
    contract.latestRoundData()
  ]);

  const price = Number(ethers.formatUnits(roundData.answer, Number(decimals)));
  return {
    ticker: feed.ticker,
    price,
    updatedAt: Number(roundData.updatedAt) * 1000
  };
}

export async function GET() {
  for (const rpcUrl of BASE_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, 8453, {
        staticNetwork: true
      });

      const [cryptoRaw, rwaRaw] = await Promise.all([
        Promise.allSettled(CRYPTO_FEEDS.map((f) => readChainlinkFeed(provider, f))),
        Promise.allSettled(RWA_FEEDS.map((f) => readChainlinkFeed(provider, f)))
      ]);

      const crypto = cryptoRaw
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      const rwa = rwaRaw
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      if (crypto.length > 0) {
        return NextResponse.json({ crypto, rwa });
      }
    } catch {
      // Fallback to next RPC
    }
  }

  return NextResponse.json({ error: "RPC unavailable" }, { status: 502 });
}
