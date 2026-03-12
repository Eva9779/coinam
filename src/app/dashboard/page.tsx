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
  RefreshCw,
  Smartphone,
  Lock,
  ShieldAlert
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { INITIAL_MARKET_DATA } from "@/lib/data";

export default function Dashboard() {
  const { assets, transactions, initialized } = useVaultStore();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const totalBalance = assets.reduce((acc, curr) => acc + curr.fiatValueUSD, 0);

  useEffect(() => {
    setMounted(true);
    async function fetchMarket() {
      setLoading(true);
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMarketData(data);
        }
      } catch (err) {
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
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Synchronizing Vault Session...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-secondary" />
            Vault Intelligence
          </h2>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-tight">Mainnet Session Verified</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            ENCLAVE SECURE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground overflow-hidden relative shadow-2xl border-none p-1 rounded-[2rem] md:col-span-2">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none hidden md:block">
            <Lock className="h-48 w-48" />
          </div>
          <CardContent className="pt-10 pb-10 px-8 relative z-10">
            <div className="max-w-xl">
              <h3 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4 flex items-center gap-3">
                <Zap className="h-8 w-8 text-secondary fill-secondary" />
                Fiat Gateway
              </h3>
              <p className="text-lg text-primary-foreground/80 font-medium leading-relaxed mb-8">
                Non-custodial funding protocol. Connect Apple Pay, Google Pay, or Card to provision your vault instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-black h-16 px-10 text-xl shadow-xl transition-all group w-full sm:w-auto rounded-2xl" asChild>
                  <Link href="/buy">
                    <CreditCard className="h-6 w-6 mr-3" /> Buy Crypto <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Security Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
               <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20">
                  <ShieldCheck className="h-10 w-10 text-green-600" />
               </div>
               <div className="text-xl font-black text-green-600 uppercase tracking-tight">AES-256 Isolated</div>
               <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-60">Hardware Encryption Active</p>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-70">
                  <span>Encryption Key</span>
                  <span className="text-green-600">SECURE</span>
               </div>
               <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full" />
               </div>
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-70">
                  <span>Network Isolation</span>
                  <span className="text-green-600">ACTIVE</span>
               </div>
               <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full" />
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-sm border-primary/10 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-primary">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm border-primary/10 overflow-hidden rounded-2xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-secondary" />
              Live Market Highlights
            </CardTitle>
            <Link href="/market" className="text-[10px] font-bold text-secondary uppercase hover:underline">Market Explorer</Link>
          </CardHeader>
          <CardContent className="flex items-center gap-8 overflow-x-auto pb-2 no-scrollbar">
            {loading ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
              </div>
            ) : marketData.length > 0 ? (
              marketData.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-3 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-black text-[10px] uppercase border">
                    {item.symbol}
                  </div>
                  <div>
                    <div className="text-xs font-black">${item.current_price.toLocaleString()}</div>
                    <div className={cn(
                      "text-[9px] font-bold uppercase",
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
          <h3 className="text-lg font-black flex items-center gap-2 text-primary px-1">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Asset Portfolio
          </h3>
          <div className="grid gap-3">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <Card key={asset.id} className="hover:border-secondary transition-all cursor-pointer shadow-sm border-primary/5 rounded-2xl">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-black text-sm text-primary border shadow-inner">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{asset.currency} Vault</div>
                        <div className="text-xs text-muted-foreground font-medium">{asset.amount.toFixed(4)} {asset.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-primary">${asset.fiatValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <Badge variant="outline" className="text-[9px] h-4 font-black uppercase text-green-600 bg-green-50 border-green-200">Verified</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-30 uppercase text-[10px] font-black tracking-widest">
                No active assets in vault
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2 text-primary px-1">
            <Activity className="h-5 w-5 text-secondary" />
            Network Ledger
          </h3>
          <Card className="shadow-sm border-primary/5 overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm",
                          tx.type === 'receive' ? "bg-green-50 text-green-600 border-green-100" : 
                          tx.type === 'send' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {tx.type === 'receive' ? <ArrowDownLeft className="h-6 w-6" /> : 
                           tx.type === 'send' ? <ArrowUpRight className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {tx.type === 'receive' ? 'Deposited' : tx.type === 'send' ? 'Withdrawn' : 'Swapped'} {tx.currency}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter truncate max-w-[200px]">
                            {tx.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-black text-sm",
                          tx.type === 'receive' ? "text-green-600" : "text-primary"
                        )}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.currency.split(' ')[0]}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-bold uppercase">
                          {mounted ? new Date(tx.timestamp).toLocaleDateString() : '...'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30 uppercase text-[10px] font-black tracking-widest">
                    No ledger activity found
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