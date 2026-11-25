"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, RefreshCw, Loader2, Banknote, Zap, Globe, Key } from "lucide-react";
import Link from "next/link";
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
      setError("Synchronizing Ledger...");
    } finally {
      setLoading(false);
    }
  }, [botConfig?.address]);

  useEffect(() => {
    fetchLiveBalances();
    const interval = setInterval(fetchLiveBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveBalances]);

  const baseEthVal = parseFloat(baseEth);
  const mainnetEthVal = parseFloat(mainnetEth);
  const usdcVal = parseFloat(usdcBalance);
  
  const totalPortfolioUsd = (baseEthVal + mainnetEthVal) * ethPriceUsd + usdcVal;

  if (!botConfig) {
    return (
      <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative min-h-[160px] flex items-center justify-center p-5 text-center">
        <div className="space-y-3">
          <Zap className="h-10 w-10 text-secondary mx-auto opacity-40" />
          <h3 className="text-lg font-black uppercase tracking-tighter">Vault Not Initialized</h3>
          <Button variant="secondary" asChild className="h-10 px-6 rounded-xl font-bold">
            <Link href="/bot">Provision Enclave</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Briefcase className="h-32 w-32" />
      </div>
      <CardHeader className="pb-2 pt-4 px-5 relative z-10 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
           <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            Private Sovereign Ledger Pulse
          </CardTitle>
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLiveBalances}
            disabled={loading}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
          <Button variant="secondary" size="sm" className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase gap-1.5 shadow-lg" asChild>
            <Link href="/withdraw">
              <Banknote className="h-3.5 w-3.5" />
              Withdraw
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pb-5 pt-0 px-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-4 w-full">
            <div className="text-3xl font-black tracking-tighter">
              {loading && totalPortfolioUsd === 0 ? (
                <div className="h-10 w-32 bg-white/10 animate-pulse rounded-lg" />
              ) : (
                `$${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-0.5">
                <span className="text-[8px] font-bold uppercase opacity-60 block">Ethereum Mainnet</span>
                <span className="text-xs font-black tracking-widest text-blue-300">
                  {mainnetEth} ETH
                </span>
              </div>

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              <div className="space-y-0.5">
                <span className="text-[8px] font-bold uppercase opacity-60 block">Base Mainnet</span>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-black tracking-widest text-green-400">
                      {baseEth} ETH
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-xs font-black tracking-widest text-secondary">
                      {usdcBalance} USDC
                    </span>
                </div>
              </div>
              
              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              <div className="space-y-0.5">
                <span className="text-[8px] font-bold uppercase opacity-60 block">Price Oracle</span>
                <span className="text-xs font-black tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  ${ethPriceUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {user && botConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                   <Label className="text-[9px] font-black uppercase tracking-[0.1em] text-secondary opacity-80 flex items-center gap-2">
                     <Key className="h-3 w-3" /> Enclave Endpoint
                   </Label>
                   <div className="p-2 bg-slate-900 rounded-lg font-mono text-[10px] font-black text-white/70 break-all border border-white/5 leading-tight select-all">
                      {botConfig.address}
                   </div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col justify-center">
                  <BridgeToBaseButton compact userId={user.uid} selectedAddress={botConfig.address} />
                </div>
              </div>
            )}
            
            {error && <p className="text-[9px] font-black text-amber-400 uppercase animate-pulse">{error}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
