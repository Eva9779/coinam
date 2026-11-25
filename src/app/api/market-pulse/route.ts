import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://1rpc.io"
];

// Standard Chainlink AggregatorV3Interface ABI
const CHAINLINK_ABI = [
  "function decimals() external view returns (uint8)",
  "function description() external view returns (string)",
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

// Official Chainlink Price Feed Smart Contracts on Base Mainnet
const FEEDS = {
  crypto: [
    { symbol: "ETH / USD", address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" },
    { symbol: "BTC / USD", address: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F" },
    { symbol: "SOL / USD", address: "0x975043adBb80fc32276CbF9Bbcfd4A601a12462D" }
  ],
  rwa: [
    // On-chain Real-World Asset (RWA) & Commodity feeds on Base Mainnet
    { symbol: "XAU / USD (Gold)", address: "0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6" },
    { symbol: "EUR / USD (Forex)", address: "0xc91D87E81faB8f93699ECf7Ee9B44D11e1D53F0F" }
  ]
};

export const dynamic = "force-dynamic";

async function readFeed(
  provider: ethers.JsonRpcProvider,
  item: { symbol: string; address: string }
) {
  const contract = new ethers.Contract(item.address, CHAINLINK_ABI, provider);
  const [decimals, roundData] = await Promise.all([
    contract.decimals(),
    contract.latestRoundData()
  ]);

  const price = Number(ethers.formatUnits(roundData.answer, Number(decimals)));
  const updatedAtMs = Number(roundData.updatedAt) * 1000;

  return {
    symbol: item.symbol,
    price,
    updatedAt: new Date(updatedAtMs).toISOString(),
    roundId: roundData.roundId.toString()
  };
}

export async function GET() {
  for (const rpcUrl of BASE_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, 8453, {
        staticNetwork: true
      });

      const [cryptoResults, rwaResults] = await Promise.all([
        Promise.allSettled(FEEDS.crypto.map((f) => readFeed(provider, f))),
        Promise.allSettled(FEEDS.rwa.map((f) => readFeed(provider, f)))
      ]);

      const cryptoPulse = cryptoResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      const rwaPulse = rwaResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      if (cryptoPulse.length > 0) {
        return NextResponse.json({
          network: "Base Mainnet",
          cryptoPulse,
          rwaPulse,
          fetchedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn(`Market Pulse: RPC ${rpcUrl} failed, trying next...`);
    }
  }

  return NextResponse.json(
    { error: "Unable to read on-chain Chainlink feeds." },
    { status: 502 }
  );
}
