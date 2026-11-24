
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Zap,
  Sparkles,
  Terminal,
  TrendingUp,
  TrendingDown,
  Briefcase,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Loader2,
  Landmark,
  DollarSign,
  ArrowRight,
  Banknote,
  ChevronLeft,
  Activity
} from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const CustomPulseMarquee = ({ items, label }: { items: any[], label: string }) => {
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
            const minDec = item.currentPriceUSD < 1 ? 4 : 2;
            const maxDec = Math.max(minDec, 2);

            return (
              <div key={`${item.currency}-${idx}`} className="flex flex-col items-start min-w-[150px] transition-all hover:bg-white/5 p-2 rounded-xl">
                <span className="text-[11px] font-black text-secondary uppercase tracking-[0.2em] mb-1">{item.currency}</span>
                <span className="text-lg font-black text-white leading-tight">
                  ${item.currentPriceUSD.toLocaleString(undefined, { 
                    minimumFractionDigits: minDec,
                    maximumFractionDigits: maxDec 
                  })}
                </span>
                <span className={cn(
                  "text-[11px] font-black leading-tight flex items-center gap-0.5 mt-1",
                  item.dailyChangePercent >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {item.dailyChangePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {item.dailyChangePercent >= 0 ? '+' : ''}{item.dailyChangePercent.toFixed(2)}%
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
    assets, 
    transactions, 
    initialized, 
    botActive,
    botLogs,
    marketData,
    totalBotEarnings
  } = useWalletStore();
  
  const [mounted, setMounted] = useState(false);
  const [latency, setLatency] = useState(14);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setLatency(prev => {
        const next = prev + (Math.random() * 4 - 2);
        return Math.max(10, Math.min(25, Math.floor(next)));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalBalance = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const price = marketData.find(m => m.currency === asset.currency)?.currentPriceUSD || 0;
      return acc + (asset.amount * price);
    }, 0);
  }, [assets, marketData]);

  const cryptoMarketData = useMemo(() => 
    marketData.filter(m => ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'USDC'].includes(m.currency)), 
  [marketData]);

  const equityMarketData = useMemo(() => 
    marketData.filter(m => ['NVD', 'SOX', 'TQQQ', 'META', 'AAPL'].includes(m.currency)), 
  [marketData]);

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
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Mainnet Connected: Real-World Assets</p>
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
        <Card className="shadow-2xl border-none bg-primary text-white rounded-[2rem] overflow-hidden relative min-h-[160px]">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Briefcase className="h-48 w-48" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Unified Net Worth (Wallet Assets)</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="text-6xl font-black tracking-tighter">
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-60 block">Strategy Yield Status</span>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest flex items-center gap-1.5",
                      botActive ? "text-secondary animate-pulse" : "text-green-400"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", botActive ? "bg-secondary" : "bg-green-400")} />
                      {botActive ? "HARVESTING" : "SETTLED"}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-60 block">Network Latency</span>
                    <span className="text-xs font-black uppercase tracking-widest text-green-400 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      {mounted ? `${latency}ms` : '...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" className="h-12 px-6 font-bold rounded-xl gap-2 shadow-xl hover:scale-105 transition-transform" asChild>
                  <Link href="/withdraw">
                    <Banknote className="h-5 w-5" />
                    Withdraw to Bank
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-secondary" />
                REAL-TIME CRYPTOGRAPHIC PULSE
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <CustomPulseMarquee items={cryptoMarketData} label="Crypto Pulse" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Landmark className="h-3 w-3 text-secondary" />
                REAL-TIME EQUITY PULSE (RWA)
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <CustomPulseMarquee items={equityMarketData} label="Stock & Bond Pulse" />
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
              <div className="py-20 text-center border-2 border-dashed rounded-[2rem] opacity-30">
                 <History className="h-12 w-12 mx-auto mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">No activity detected on ledger</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-primary flex items-center gap-2 px-2">
            <Terminal className="h-5 w-5 text-secondary" />
            Strategy Feed (+2.1%)
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
