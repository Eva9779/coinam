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
  ChevronRight
} from "lucide-react";
import { useWalletStore, Transaction } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { INITIAL_MARKET_DATA } from "@/lib/data";

export default function Dashboard() {
  const { assets, stockAssets, transactions, initialized, botActive, stockBotActive, botLogs, totalBotEarnings } = useWalletStore();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const liveTotalBalance = useMemo(() => {
    if (!initialized) return 0;
    const cryptoVal = assets.reduce((acc, asset) => {
      const liveCoin = marketData.find(c => c.symbol?.toUpperCase() === asset.currency?.toUpperCase());
      const currentPrice = liveCoin?.current_price || (asset.fiatValueUSD / Math.max(asset.amount, 0.00001));
      return acc + (asset.amount * currentPrice);
    }, 0);
    const stockVal = stockAssets.reduce((acc, s) => acc + s.totalValue, 0);
    return cryptoVal + stockVal;
  }, [assets, stockAssets, marketData, initialized]);

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      const data = await res.json();
      if (Array.isArray(data)) setMarketData(data);
    } catch (err) {
      setMarketData(INITIAL_MARKET_DATA.map(m => ({
        id: m.currency.toLowerCase(),
        symbol: m.currency.toLowerCase(),
        current_price: m.currentPriceUSD || 0,
        price_change_percentage_24h: m.dailyChangePercent || 0
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

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
          {(botActive || stockBotActive) && (
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
               <span className="text-sm font-black text-secondary">${totalBotEarnings.toFixed(2)}</span>
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
            {loading ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
              </div>
            ) : marketData.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-4 shrink-0">
                <div className="h-10 w-10 rounded-full bg-muted border overflow-hidden">
                  <img src={item.image} alt={item.symbol} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-black">${item.current_price.toLocaleString()}</div>
                  <div className={cn("text-[10px] font-bold uppercase", item.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600")}>
                    {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
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

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
