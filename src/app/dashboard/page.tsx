"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  Cpu,
  Landmark,
  Layers
} from "lucide-react";
import { useWalletStore, Transaction } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const StockPulse = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = ''; 
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    
    const config = {
      "symbols": [
        { "proName": "NASDAQ:NVDA", "title": "NVIDIA" },
        { "proName": "NASDAQ:AAPL", "title": "Apple" },
        { "proName": "NASDAQ:TSLA", "title": "Tesla" },
        { "proName": "NASDAQ:TQQQ", "title": "TQQQ" },
        { "proName": "NASDAQ:SOXL", "title": "SOXL" },
        { "proName": "AMEX:BND", "title": "Total Bond" }
      ],
      "showSymbolLogo": true,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full h-[72px] overflow-hidden" ref={containerRef} />
  );
};

const CryptoPulse = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = ''; 
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    
    const config = {
      "symbols": [
        { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
        { "proName": "BITSTAMP:ETHUSD", "title": "Ethereum" },
        { "proName": "BINANCE:SOLUSDT", "title": "Solana" },
        { "proName": "BINANCE:BNBUSDT", "title": "BNB" },
        { "proName": "BINANCE:XRPUSDT", "title": "XRP" }
      ],
      "showSymbolLogo": true,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full h-[72px] overflow-hidden" ref={containerRef} />
  );
};

export default function Dashboard() {
  const { 
    assets, 
    stockAssets, 
    transactions, 
    initialized, 
    stockBotActive, 
    stockBotLogs,
    totalBotEarnings,
    updateStockBotSettings 
  } = useWalletStore();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalBalance = useMemo(() => {
    const cryptoVal = assets.reduce((acc, asset) => acc + asset.fiatValueUSD, 0);
    const stockVal = stockAssets.reduce((acc, s) => acc + s.totalValue, 0);
    return cryptoVal + stockVal;
  }, [assets, stockAssets]);

  if (!initialized || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Syncing Real-World Pulse...</p>
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
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Mainnet Connected: Real-Time Assets</p>
        </div>
        <div className="flex items-center gap-3">
          {stockBotActive && (
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px] animate-pulse">
              <BrainCircuit className="h-3.5 w-3.5" />
              +2.1% TARGET AGENT
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
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
               <span className="text-[9px] font-bold uppercase opacity-60">Harvested Earnings</span>
               <span className="text-sm font-black text-secondary">${totalBotEarnings.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden flex flex-col justify-center min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Landmark className="h-3 w-3 text-secondary" />
                Live Equity Pulse (Mainnet Real-Time)
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <StockPulse />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-1 rounded-[2.5rem] bg-slate-950 text-white shadow-2xl border-none p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
               <Landmark className="h-32 w-32 text-secondary" />
            </div>
            <div className="relative z-10 space-y-6">
               <div className="flex items-center justify-between">
                  <Badge className="bg-secondary text-white font-black text-[9px] tracking-widest uppercase">+2.1% Alpha Protocol</Badge>
                  <Switch checked={stockBotActive} onCheckedChange={(v) => updateStockBotSettings(v, 20, 'medium')} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">RWA Strategy Agent</h3>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Target: +2.1% Profit Harvesting</p>
               </div>
               <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                     <span>NETWORK</span>
                     <span className="text-green-400">MAINNET-CONNECTED</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase text-white/40">
                     <span>STRATEGY</span>
                     <span>DIP-HARVEST-2.1</span>
                  </div>
               </div>
               <Button className="w-full h-12 rounded-xl font-bold bg-secondary text-white shadow-xl gap-2" asChild>
                  <Link href="/stocks">
                    <Settings className="h-4 w-4" />
                    Configure Strategy
                  </Link>
               </Button>
            </div>
         </Card>

         <Card className="lg:col-span-2 shadow-sm border-primary/5 rounded-[2rem] bg-card/50 backdrop-blur-xl overflow-hidden flex flex-col justify-center min-h-[140px]">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Zap className="h-3 w-3 text-secondary" />
                Live Crypto Pulse (Mainnet Real-Time)
             </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <CryptoPulse />
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
            Strategy Feed (+2.1% Goal)
          </h3>
          <Card className="shadow-2xl border-none bg-slate-950 text-white rounded-[2rem] overflow-hidden min-h-[400px]">
             <CardHeader className="border-b border-white/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Real-Time Mainnet Pulse</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4 font-mono text-[10px] max-h-[450px] overflow-y-auto no-scrollbar">
                {stockBotLogs.slice(-10).map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-2 leading-relaxed",
                    log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300"
                  )}>
                    <span className="opacity-30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                {stockBotLogs.length === 0 && (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                    <Landmark className="h-10 w-10" />
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
