"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw, Loader2, Landmark, Banknote, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const WALLET_ADDRESS = "0xeb585480Cd9edA87f26C281C48B84958aEb090ec";

export function LiveWalletBalance() {
  const [ethBalance, setEthBalance] = useState<string>("0.000000");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveBalances = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetch("/api/wallet-balance", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load live balance");

      const data = await res.json();
      setEthBalance(data.ethBalance);
      setUsdcBalance(data.usdcBalance);
      setEthPriceUsd(data.ethPriceUsd);
    } catch (err) {
      console.error("Balance sync error:", err);
      setError("Syncing with Base Mainnet...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveBalances();
    const interval = setInterval(fetchLiveBalances, 15000);
    return () => clearInterval(interval);
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
        <div className="flex items-center gap-2">
           <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            Mainnet Live Ledger Pulse
          </CardTitle>
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
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
                      {ethBalance} ETH
                    </span>
                    <span className="text-[9px] opacity-50 font-bold tracking-tighter">${(ethVal * ethPriceUsd).toFixed(2)} USD</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-secondary">
                      {usdcBalance} USDC
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
                  PROXIED
                </span>
              </div>
            </div>
            
            {error && <p className="text-[10px] font-black text-amber-400 uppercase animate-pulse">{error}</p>}
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
