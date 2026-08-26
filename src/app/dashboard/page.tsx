
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Activity,
  Zap,
  CreditCard,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Lock,
  Bot,
  BrainCircuit,
  Terminal,
  BarChart3,
  TrendingUp,
  Briefcase,
  Landmark
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { INITIAL_MARKET_DATA } from "@/lib/data";

export default function Dashboard() {
  const { assets, stockAssets, transactions, initialized, botActive, stockBotActive, botLogs, isAnalyzing, totalBotEarnings } = useVaultStore();
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
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Synchronizing Production Vault...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-secondary" />
            Antigravity Dashboard
          </h2>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-tight">Mainnet & Equity Session Verified</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-sm border-primary/10 rounded-2xl md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="h-3 w-3 text-primary" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-primary">
              ${liveTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Unified Portfolio Valuation</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm border-primary/10 overflow-hidden rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-secondary" />
              Institutional Market highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-8 overflow-x-auto pb-2 no-scrollbar">
            {loading ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
              </div>
            ) : marketData.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-3 shrink-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-black text-[10px] uppercase border overflow-hidden">
                  <img src={item.image} alt={item.symbol} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-xs font-black">${item.current_price.toLocaleString()}</div>
                  <div className={cn("text-[9px] font-bold uppercase", item.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600")}>
                    {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2 text-primary px-1">
            <Briefcase className="h-5 w-5 text-secondary" />
            Equity & Cryptography
          </h3>
          <div className="grid gap-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="hover:border-secondary transition-all cursor-pointer shadow-sm border-primary/5 rounded-2xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center font-black text-xs text-primary border uppercase">
                      {asset.currency}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{asset.currency} Vault</div>
                      <div className="text-xs text-muted-foreground font-medium">{asset.amount.toFixed(4)} {asset.currency}</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-primary">${asset.fiatValueUSD.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
            {stockAssets.map((stock) => (
              <Card key={stock.id} className="hover:border-secondary transition-all cursor-pointer shadow-sm border-primary/5 rounded-2xl">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary/5 flex items-center justify-center font-black text-xs text-secondary border uppercase">
                      {stock.type === 'stock' ? 'STK' : 'BND'}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{stock.name} ({stock.symbol})</div>
                      <div className="text-xs text-muted-foreground font-medium">{stock.shares} units</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-primary">${stock.totalValue.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2 text-primary px-1">
            <Terminal className="h-5 w-5 text-secondary" />
            Quantum Intelligence Feed
          </h3>
          <Card className="shadow-sm border-primary/5 overflow-hidden rounded-[2rem] bg-slate-950 text-slate-100 min-h-[300px]">
            <CardContent className="p-6 space-y-3 font-mono text-xs max-h-[400px] overflow-y-auto no-scrollbar">
              {botLogs.slice(-5).map((log, i) => (
                <div key={i} className={cn("flex gap-2", log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300")}>
                  <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
              {botLogs.length === 0 && (
                <div className="py-12 text-center opacity-30 flex flex-col items-center">
                  <Bot className="h-8 w-8 mb-2" />
                  <p className="uppercase tracking-widest text-[10px]">Awaiting signals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
