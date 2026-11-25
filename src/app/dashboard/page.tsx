"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Zap,
  Sparkles,
  Terminal,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Loader2,
  Landmark,
  Activity,
  Globe,
  Clock
} from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LiveWalletBalance } from "@/components/dashboard/live-wallet-balance";

const CustomPulseMarquee = ({ items, label }: { items: any[], label: string }) => {
  if (!items || items.length === 0) return (
    <div className="w-full bg-slate-900 h-[110px] rounded-2xl flex items-center justify-center opacity-30">
      <Loader2 className="h-4 w-4 animate-spin text-secondary mr-2" />
      <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Awaiting On-Chain Oracle...</span>
    </div>
  );

  const displayItems = [...items, ...items];

  return (
    <div className="w-full bg-slate-900 border-y border-white/5 py-4 relative group rounded-2xl shadow-inner h-[110px] overflow-hidden">
      <div className="absolute top-2 left-4 z-20 text-[9px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
        {label}
      </div>
      
      <ScrollArea className="w-full h-full pt-4">
        <div className="flex animate-marquee whitespace-nowrap w-max gap-8 px-6 hover:[animation-play-state:paused]">
          {displayItems.map((item, idx) => {
            const price = item.price;
            const minDec = price < 1 ? 4 : 2;
            const maxDec = Math.max(minDec, 2);

            return (
              <div key={`${item.ticker}-${idx}`} className="flex flex-col items-start min-w-[180px] transition-all hover:bg-white/5 p-2 rounded-xl">
                <span className="text-[11px] font-black text-secondary uppercase tracking-[0.2em] mb-1">{item.ticker}</span>
                <span className="text-lg font-black text-white leading-tight">
                  ${price.toLocaleString(undefined, { 
                    minimumFractionDigits: minDec,
                    maximumFractionDigits: maxDec 
                  })}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground/60 flex items-center gap-1 mt-1 uppercase">
                  <Clock className="h-2.5 w-2.5" />
                  Block: {new Date(item.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </ScrollArea>
    </div>
  );
};

export default function Dashboard() {
  const { 
    transactions, 
    initialized, 
    botActive,
    botLogs
  } = useWalletStore();
  
  const [mounted, setMounted] = useState(false);
  const [pulseData, setPulseData] = useState<{ crypto: any[], rwa: any[] }>({ crypto: [], rwa: [] });
  const [pulseLoading, setPulseLoading] = useState(true);

  const fetchMarketPulse = useCallback(async () => {
    try {
      const res = await fetch("/api/market-pulse", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPulseData({
          crypto: data.crypto || [],
          rwa: data.rwa || []
        });
      }
    } catch (err) {
      console.error("Market Pulse Sync Failed:", err);
    } finally {
      setPulseLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchMarketPulse();
    const interval = setInterval(fetchMarketPulse, 15000);
    return () => clearInterval(interval);
  }, [fetchMarketPulse]);

  if (!initialized || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Syncing Mainnet Pulse...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-secondary" />
            Institutional Ledger
          </h2>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Chainlink Oracles: Live On-Chain Market Discovery</p>
        </div>
        <div className="flex items-center gap-3">
          {botActive && (
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px] animate-pulse">
              <Zap className="h-3.5 w-3.5" />
              BOT ACTIVE
            </Badge>
          )}
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            ENCLAVE SECURE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <LiveWalletBalance />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-secondary" />
                CHAINLINK CRYPTOGRAPHIC PULSE
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <CustomPulseMarquee items={pulseData.crypto} label="Mainnet Crypto Oracle" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Landmark className="h-3 w-3 text-secondary" />
                CHAINLINK EQUITY PULSE (RWA)
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <CustomPulseMarquee items={pulseData.rwa} label="Commodity & Forex Oracle" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-primary flex items-center gap-2">
              <History className="h-5 w-5 text-secondary" />
              Recent Network Activity
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-[10px] font-black uppercase tracking-widest gap-1">
               <Link href="/transactions">View Full Ledger <ChevronRight className="h-3 w-3" /></Link>
            </Button>
          </div>
          
          <div className="grid gap-3">
            {transactions.length > 0 ? transactions.slice(0, 5).map((tx) => (
              <Card key={tx.id} className="shadow-sm border-primary/5 hover:border-secondary/20 transition-all rounded-2xl overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center border-2",
                        tx.type === 'receive' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                        tx.type === 'send' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      )}>
                         {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : 
                          tx.type === 'send' ? <ArrowUpRight className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{tx.description}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          {tx.currency} • {new Date(tx.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className={cn("font-black text-sm", tx.type === 'receive' ? "text-green-600" : "text-primary")}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} {tx.currency.split(' ')[0]}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground">${tx.fiatValueUSD.toLocaleString()}</div>
                   </div>
                </CardContent>
              </Card>
            )) : (
              <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem] opacity-30">
                 <History className="h-12 w-12 mx-auto mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">No activity detected on ledger</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-primary flex items-center gap-2 px-2">
            <Terminal className="h-5 w-5 text-secondary" />
            Strategy Feed
          </h3>
          <Card className="shadow-2xl border-none bg-slate-950 text-white rounded-[2rem] overflow-hidden min-h-[400px]">
             <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Real-Time Mainnet Pulse</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4 font-mono text-[10px] max-h-[450px] overflow-y-auto no-scrollbar">
                {botLogs.slice(-15).reverse().map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-2 leading-relaxed",
                    log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300"
                  )}>
                    <span className="opacity-30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                {botLogs.length === 0 && (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                    <Zap className="h-10 w-10" />
                    <p className="uppercase font-black tracking-widest">Awaiting Alpha Entry</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
