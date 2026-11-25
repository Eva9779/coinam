"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw, Loader2, Landmark, Banknote, ShieldCheck, Zap, Globe, Key } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUserHook } from "@/firebase";
import { BridgeToBaseButton } from "@/components/bot/bridge-to-base-button";
import { useWalletStore } from "@/lib/store";
import { Label } from "@/components/ui/label";

export function LiveWalletBalance() {
  const { user } = useUserHook();
  const { botConfig } = useWalletStore();
  const [baseEth, setBaseEth] = useState<string>("0.000000");
  const [mainnetEth, setMainnetEth] = useState<string>("0.000000");
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveBalances = useCallback(async () => {
    if (!botConfig?.address) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      setError(null);
      const res = await fetch(`/api/wallet-balance?address=${botConfig.address}`, { 
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) throw new Error("Failed to load live balance");

      const data = await res.json();
      setBaseEth(data.baseEth);
      setMainnetEth(data.mainnetEth);
      setUsdcBalance(data.usdcBalance);
      setEthPriceUsd(data.ethPriceUsd);
    } catch (err) {
      console.warn("Balance sync delay:", err);
      setError("Synchronizing Ledger (Background)...");
    } finally {
      setLoading(false);
    }
  }, [botConfig?.address]);

  useEffect(() => {
    fetchLiveBalances();
    const interval = setInterval(fetchLiveBalances, 20000);
    return () => clearInterval(interval);
  }, [fetchLiveBalances]);

  const baseEthVal = parseFloat(baseEth);
  const mainnetEthVal = parseFloat(mainnetEth);
  const usdcVal = parseFloat(usdcBalance);
  
  const totalPortfolioUsd = (baseEthVal + mainnetEthVal) * ethPriceUsd + usdcVal;

  if (!botConfig) {
    return (
      <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative min-h-[200px] flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <Zap className="h-12 w-12 text-secondary mx-auto opacity-40" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Vault Not Initialized</h3>
          <p className="text-sm opacity-60 max-w-xs">Initialize your non-custodial strategy enclave to activate real-time ledger monitoring.</p>
          <Button variant="secondary" asChild className="h-12 px-8 rounded-xl font-bold">
            <Link href="/bot">Provision Enclave</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative min-h-[160px]">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Briefcase className="h-48 w-48" />
      </div>
      <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
           <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            Private Sovereign Ledger Pulse
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
          <div className="space-y-6">
            <div className="text-6xl font-black tracking-tighter">
              {loading && totalPortfolioUsd === 0 ? (
                <div className="h-16 w-48 bg-white/10 animate-pulse rounded-xl" />
              ) : (
                `$${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-8">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase opacity-60 block">Ethereum Mainnet</span>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-widest text-blue-300">
                    {mainnetEth} ETH
                  </span>
                  <span className="text-[9px] opacity-50 font-bold tracking-tighter">${(mainnetEthVal * ethPriceUsd).toFixed(2)} USD</span>
                </div>
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase opacity-60 block">Base Mainnet</span>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-widest text-green-400">
                      {baseEth} ETH
                    </span>
                    <span className="text-[9px] opacity-50 font-bold tracking-tighter">${(baseEthVal * ethPriceUsd).toFixed(2)} USD</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-widest text-secondary">
                      {usdcBalance} USDC
                    </span>
                    <span className="text-[9px] opacity-50 font-bold tracking-tighter">${usdcVal.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>
              
              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase opacity-60 block">Price Oracle</span>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  ${ethPriceUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {user && botConfig && (
              <div className="max-w-md bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-80 flex items-center gap-2">
                     <Key className="h-3 w-3" /> Linked Enclave Endpoint
                   </Label>
                   <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] font-black text-white/70 break-all border border-white/5">
                      {botConfig.address}
                   </div>
                </div>
                <BridgeToBaseButton userId={user.uid} selectedAddress={botConfig.address} />
              </div>
            )}
            
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
              {botConfig.address.slice(0, 16)}...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
