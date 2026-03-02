"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck, 
  Activity,
  Zap,
  CreditCard,
  Sparkles,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { INITIAL_MARKET_DATA } from "@/lib/data";

export const dynamic = 'force-dynamic';

interface MarketItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export default function Dashboard() {
  const { assets, transactions, initialized } = useVaultStore();
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const totalBalance = assets.reduce((acc, curr) => acc + curr.fiatValueUSD, 0);

  useEffect(() => {
    setMounted(true);
    async function fetchMarket() {
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMarketData(data);
        }
      } catch (err) {
        console.warn("Market connectivity interrupted. Using local registry.");
        setMarketData(INITIAL_MARKET_DATA.map(m => ({
          id: m.currency.toLowerCase(),
          symbol: m.currency,
          name: m.currency,
          current_price: m.currentPriceUSD || 0,
          price_change_percentage_24h: m.dailyChangePercent || 0
        })));
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, []);

  if (!initialized || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Synchronizing Secure Vault...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-secondary" />
          Dashboard
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-semibold">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            SYNCED
          </Badge>
        </div>
      </div>

      {/* Hero Buy Section */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden relative shadow-2xl border-none p-1 sm:p-2 rounded-2xl sm:rounded-3xl">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none hidden md:block">
          <CreditCard className="h-48 w-48" />
        </div>
        <CardContent className="pt-8 pb-8 px-6 sm:pt-10 sm:pb-10 sm:px-8 relative z-10">
          <div className="max-w-xl">
            <h3 className="text-2xl sm:text-4xl font-black tracking-tighter mb-4 flex items-center gap-3">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-secondary fill-secondary" />
              Fiat Gateway
            </h3>
            <p className="text-base sm:text-lg text-primary-foreground/80 font-medium leading-relaxed mb-6 sm:mb-8">
              Convert local currency into digital assets instantly. Your vault is synchronized across all devices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-black h-14 sm:h-16 px-6 sm:px-10 text-lg sm:text-xl shadow-xl transition-all group w-full sm:w-auto" asChild>
                <Link href="/buy">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" /> Buy Crypto <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 sm:h-16 px-4 sm:px-6 font-bold" asChild>
                  <Link href="/transactions?tab=send">
                    <ArrowUpRight className="h-5 w-5 mr-2" /> Send
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 sm:h-16 px-4 sm:px-6 font-bold" asChild>
                  <Link href="/transactions?tab=receive">
                    <ArrowDownLeft className="h-5 w-5 mr-2" /> Receive
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Vault Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 font-medium">Secured by Cryptographic Enclave</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm border-primary/10 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Live Highlights
            </CardTitle>
            <Link href="/market" className="text-[10px] font-bold text-secondary uppercase hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="flex items-center gap-6 sm:gap-8 overflow-x-auto pb-4 sm:pb-2 no-scrollbar">
            {loading ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
              </div>
            ) : marketData.length > 0 ? (
              marketData.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3 shrink-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center font-black text-[10px] uppercase border">
                    {item.symbol}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black">${item.current_price.toLocaleString()}</div>
                    <div className={cn(
                      "text-[9px] sm:text-[10px] font-bold uppercase",
                      item.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Syncing...</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-primary px-1">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Asset Breakdown
          </h3>
          <div className="grid gap-3">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <Card key={asset.id} className="hover:border-secondary transition-all cursor-pointer shadow-sm border-primary/5">
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center font-black text-xs sm:text-sm text-primary border">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-bold text-base sm:text-lg">{asset.currency}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{asset.amount.toFixed(4)} {asset.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-base sm:text-lg text-primary">${asset.fiatValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3 sm:h-4 font-black uppercase text-green-600 bg-green-50 border-green-200">Live</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-16 sm:py-20 text-center border-2 border-dashed rounded-2xl sm:rounded-3xl opacity-30 uppercase text-[10px] font-black tracking-widest">
                No active assets
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-primary px-1">
            <Activity className="h-5 w-5 text-secondary" />
            Activity Ledger
          </h3>
          <Card className="shadow-sm border-primary/5 overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={cn(
                          "h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl flex items-center justify-center border",
                          tx.type === 'receive' ? "bg-green-50 text-green-600 border-green-100" : 
                          tx.type === 'send' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6" /> : 
                           tx.type === 'send' ? <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" /> : <Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                            {tx.type === 'receive' ? 'Received' : tx.type === 'send' ? 'Sent' : 'Trade'} {tx.currency}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-tighter truncate max-w-[100px] sm:max-w-[150px]">
                            {tx.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-black text-xs sm:text-sm",
                          tx.type === 'receive' ? "text-green-600" : "text-primary"
                        )}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.currency.split(' ')[0]}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">
                          {mounted ? new Date(tx.timestamp).toLocaleDateString() : '...'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 sm:py-20 text-center opacity-30 uppercase text-[10px] font-black tracking-widest">
                    No ledger history
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
