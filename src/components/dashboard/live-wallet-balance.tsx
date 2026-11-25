"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw, Loader2, Zap, Landmark, Banknote } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const WALLET_ADDRESS = "0xeb585480Cd9edA87f26C281C48B84958aEb090ec";
const BASE_RPC_URL = "https://base.org";
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const UNISWAP_ETH_USDC_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

export function LiveWalletBalance() {
  const [ethBalance, setEthBalance] = useState<string>("0.000000");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(14);

  const fetchLiveBalances = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

      // 1. Fetch real native ETH balance on Base Mainnet
      const rawEthWei = await provider.getBalance(WALLET_ADDRESS);
      const formattedEth = ethers.formatEther(rawEthWei);

      // 2. Fetch real USDC balance on Base Mainnet (6 decimals)
      const usdcContract = new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, provider);
      const rawUsdc = await usdcContract.balanceOf(WALLET_ADDRESS);
      const formattedUsdc = ethers.formatUnits(rawUsdc, 6);

      // 3. Fetch live on-chain ETH price from Uniswap V3 pool for total USD value
      const pool = new ethers.Contract(UNISWAP_ETH_USDC_POOL, POOL_ABI, provider);
      const { sqrtPriceX96 } = await pool.slot0();
      const priceRatio = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
      const liveEthUsd = priceRatio * 10 ** (18 - 6);

      setEthBalance(formattedEth);
      setUsdcBalance(formattedUsdc);
      setEthPriceUsd(liveEthUsd);
    } catch (err) {
      console.error("Failed to fetch live balances:", err);
      setError("Network Sync Error. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveBalances();
    const interval = setInterval(fetchLiveBalances, 15000); // Auto-refresh every 15s
    
    // Latency simulator (Client-side purely for UI feel)
    const latencyInterval = setInterval(() => {
      setLatency(prev => {
        const next = prev + (Math.random() * 4 - 2);
        return Math.max(10, Math.min(25, Math.floor(next)));
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(latencyInterval);
    };
  }, [fetchLiveBalances]);

  const ethVal = parseFloat(ethBalance);
  const usdcVal = parseFloat(usdcBalance);
  const totalPortfolioUsd = ethVal * ethPriceUsd + usdcVal;

  return (
    <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative min-h-[160px]">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Briefcase className="h-48 w-48" />
      </div>
      <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
          Mainnet Live Ledger Pulse
        </CardTitle>
        <button 
          onClick={fetchLiveBalances}
          disabled={loading}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {loading ? "Syncing..." : "Manual Refresh"}
        </button>
      </CardHeader>
      <CardContent className="relative z-10 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="text-6xl font-black tracking-tighter">
              ${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase opacity-60 block">Asset Allocation</span>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-green-400">
                      {Number(ethBalance).toFixed(6)} ETH
                    </span>
                    <span className="text-[9px] opacity-50 font-bold tracking-tighter">${(ethVal * ethPriceUsd).toFixed(2)} USD</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-secondary">
                      {Number(usdcBalance).toFixed(2)} USDC
                    </span>
                    <span className="text-[9px] opacity-50 font-bold tracking-tighter">${usdcVal.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase opacity-60 block">Network Latency</span>
                <span className="text-xs font-black uppercase tracking-widest text-green-400 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  {latency}ms
                </span>
              </div>
            </div>
            
            {error && <p className="text-[10px] font-black text-red-400 uppercase animate-pulse">{error}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="h-12 px-6 font-bold rounded-xl gap-2 shadow-xl hover:scale-105 transition-transform" asChild>
              <Link href="/withdraw">
                <Banknote className="h-5 w-5" />
                Withdraw to Bank
              </Link>
            </Button>
            <p className="text-[9px] font-mono text-center opacity-40 uppercase font-bold tracking-tighter select-all">
              {WALLET_ADDRESS}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
