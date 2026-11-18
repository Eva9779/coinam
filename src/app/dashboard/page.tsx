
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Activity,
  Zap,
  Sparkles,
  RefreshCw,
  Bot,
  BrainCircuit,
  Terminal,
  TrendingUp,
  Briefcase,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Loader2,
  Globe,
  Settings,
  Cpu
} from "lucide-react";
import { useWalletStore, Transaction } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function Dashboard() {
  const { 
    assets, 
    stockAssets, 
    transactions, 
    initialized, 
    botActive, 
    stockBotActive, 
    derivActive,
    derivBalance,
    botLogs, 
    totalBotEarnings,
    marketData,
    updateDerivSettings 
  } = useWalletStore();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const liveTotalBalance = useMemo(() => {
    if (!initialized || !marketData.length) return 0;
    
    const cryptoVal = assets.reduce((acc, asset) => {
      const liveCoin = marketData.find(c => (c.symbol || c.currency)?.toUpperCase() === asset.currency?.toUpperCase());
      const currentPrice = liveCoin?.current_price || liveCoin?.currentPriceUSD || (asset.fiatValueUSD / Math.max(asset.amount, 0.00001));
      return acc + (asset.amount * currentPrice);
    }, 0);

    const stockVal = stockAssets.reduce((acc, s) => {
      const liveStock = marketData.find(m => m.symbol === s.symbol || s.symbol?.includes(m.symbol));
      const currentPrice = liveStock?.current_price || s.currentPrice;
      return acc + (s.shares * currentPrice);
    }, 0);

    return cryptoVal + stockVal + derivBalance;
  }, [assets, stockAssets, marketData, initialized, derivBalance]);

  if (!initialized || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Syncing Production Session...</p>
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
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Mainnet & Equity Protocol Active</p>
        </div>
        <div className="flex items-center gap-3">
          {(botActive || stockBotActive || derivActive) && (
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px] animate-pulse">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI QUANTUM ACTIVE
            </Badge>
          )}
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            ENCLAVE SECURE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 shadow-2xl border-primary/5 bg-primary text-white rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Briefcase className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Unified Net Worth</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-black tracking-tighter">
              ${liveTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
               <span className="text-[9px] font-bold uppercase opacity-60">Strategy Yield</span>
               <span className="text-sm font-black text-secondary animate-in fade-in duration-1000">${totalBotEarnings.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-4">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-secondary" />
                Live Market Pulse
             </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-12 overflow-x-auto no-scrollbar pb-2">
            {marketData.length === 0 ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
              </div>
            ) : marketData.slice(0, 8).map((item, idx) => {
              const symbol = item?.symbol || item?.currency || '???';
              const price = item?.current_price || item?.currentPriceUSD || 0;
              const change = item?.price_change_percentage_24h || item?.dailyChangePercent || 0;
              
              return (
                <div key={item?.id || idx} className="flex items-center gap-4 shrink-0 animate-in fade-in slide-in-from-left-2 duration-500">
                  {item?.image && (
                    <div className="h-10 w-10 rounded-full bg-muted border overflow-hidden">
                      <img src={item.image} alt={symbol} className="h-full w-full object-cover" />
                    </div>
                  )}
                  {!item?.image && (
                    <div className="h-10 w-10 rounded-full bg-secondary/10 border-2 border-secondary/20 flex items-center justify-center font-black text-[10px] text-secondary uppercase">
                      { symbol.slice(0, 3) }
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-black">${price.toLocaleString()}</div>
                    <div className={cn("text-[10px] font-bold uppercase", change >= 0 ? "text-green-600" : "text-red-600")}>
                      {change >= 0 ? '+' : ''}{change?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-1 rounded-[2.5rem] bg-slate-950 text-white shadow-2xl border-none p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
               <Globe className="h-32 w-32 text-secondary" />
            </div>
            <div className="relative z-10 space-y-6">
               <div className="flex items-center justify-between">
                  <Badge className="bg-secondary text-white font-black text-[9px] tracking-widest uppercase">Deriv Protocol</Badge>
                  <Switch checked={derivActive} onCheckedChange={updateDerivSettings} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">Synthetic Indices</h3>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">High-Frequency Autonomous Execution</p>
               </div>
               <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                     <span>API LINK</span>
                     <span className={cn(derivActive ? "text-green-400" : "text-red-400")}>{derivActive ? "SECURE-ESTABLISHED" : "OFFLINE"}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                     <span>STRATEGY</span>
                     <span>VOLATILITY-100-AI</span>
                  </div>
               </div>
               <Button className="w-full h-12 rounded-xl font-bold bg-secondary text-white shadow-xl gap-2" asChild>
                  <Link href="/bot">
                    <Settings className="h-4 w-4" />
                    Configure Protocol
                  </Link>
               </Button>
            </div>
         </Card>

         <Card className="lg:col-span-2 rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/5 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-black text-primary flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-secondary" />
                  Quantum Performance
               </h3>
               <Badge variant="outline" className="text-[9px] font-bold">REAL-TIME TELEMETRY</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                     <span>Mainnet Load</span>
                     <span>42%</span>
                  </div>
                  <div className="h-2 w-full bg-primary/5 rounded-full overflow-hidden">
                     <div className="h-full bg-secondary w-[42%] animate-in slide-in-from-left duration-1000" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                     <span>AI Neural Integrity</span>
                     <span>99.8%</span>
                  </div>
                  <div className="h-2 w-full bg-primary/5 rounded-full overflow-hidden">
                     <div className="h-full bg-green-500 w-[99.8%] animate-in slide-in-from-left duration-1000" />
                  </div>
               </div>
            </div>
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
            AI Strategy Feed
          </h3>
          <Card className="shadow-2xl border-none bg-slate-950 text-white rounded-[2rem] overflow-hidden min-h-[400px]">
             <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Real-Time Analysis</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4 font-mono text-[10px] max-h-[450px] overflow-y-auto no-scrollbar">
                {botLogs.slice(-10).map((log, i) => (
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
                    <Bot className="h-10 w-10" />
                    <p className="uppercase font-black tracking-widest">Awaiting Alpha Signals</p>
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
