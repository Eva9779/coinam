"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Zap,
  Sparkles,
  Terminal,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Loader2,
  Landmark,
  Globe,
  Clock,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const PulseDisplay = ({ items, label, loading }: { items: any[], label: string, loading: boolean }) => {
  if (loading || !items || items.length === 0) return (
    <div className="w-full bg-slate-950 h-[100px] rounded-2xl flex items-center justify-center border border-white/5">
      <Loader2 className="h-4 w-4 animate-spin text-secondary mr-2" />
      <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-50">Syncing Oracle...</span>
    </div>
  );

  return (
    <div className="w-full bg-slate-950 border border-white/10 rounded-2xl shadow-inner h-[100px] overflow-hidden flex items-center px-4 relative">
       <div className="absolute top-2 left-4 z-20 text-[8px] font-black text-secondary/40 uppercase tracking-widest flex items-center gap-1.5">
        <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
        {label}
      </div>
      <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full pt-4">
        {items.map((item, idx) => {
          const isUp = item.changePercent >= 0;
          return (
            <div key={`${item.ticker}-${idx}`} className="flex flex-col min-w-[140px] border-r border-white/5 last:border-none pr-6">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{item.ticker}</span>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tighter">
                  ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={cn(
                  "flex items-center gap-1 text-[9px] font-bold mt-0.5",
                  isUp ? "text-green-400" : "text-red-400"
                )}>
                  {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { 
    transactions, 
    initialized, 
    botLogs,
    marketPulse
  } = useWalletStore();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-secondary" />
            Institutional Ledger
          </h2>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Global Mainnet Discovery: Real-Time Performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            ENCLAVE SECURE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-2xl border-none rounded-[2rem] bg-slate-900 overflow-hidden min-h-[160px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                <Zap className="h-3 w-3" />
                REAL-TIME CRYPTOGRAPHIC PULSE
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <PulseDisplay items={marketPulse.crypto} label="EVM Market Feed" loading={!initialized} />
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-none rounded-[2rem] bg-slate-900 overflow-hidden min-h-[160px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
                <Landmark className="h-3 w-3" />
                REAL-TIME EQUITY PULSE (RWA)
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <PulseDisplay items={marketPulse.rwa} label="Tokenized Asset Feed" loading={!initialized} />
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
            {!initialized ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />
              ))
            ) : transactions.length > 0 ? transactions.slice(0, 5).map((tx) => (
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
