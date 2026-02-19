
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck, 
  Wallet,
  Activity,
  ArrowRight,
  Zap
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setMarketData(data);
        }
      } catch (err) {
        // Log locally for debugging but do not crash the UI
        console.warn("Market connectivity interrupted. Using local ledger values.");
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, []);

  if (!initialized || !mounted) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Portfolio Overview</h2>
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-semibold">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Network
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <Card className="md:col-span-2 bg-primary text-primary-foreground overflow-hidden relative shadow-xl border-none">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Wallet className="h-48 w-48" />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-primary-foreground/80 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Active Vault Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="gap-2 shadow-lg" asChild>
                <Link href="/transactions?tab=send">
                  <ArrowUpRight className="h-4 w-4" /> Send
                </Link>
              </Button>
              <Button variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link href="/transactions?tab=receive">
                  <ArrowDownLeft className="h-4 w-4" /> Receive
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Market Highlights */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Live Trends
              <Activity className="h-4 w-4 text-secondary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
              ))
            ) : marketData.length > 0 ? (
              marketData.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] uppercase">
                      {item.symbol}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">${item.current_price.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-semibold px-2 py-1 rounded",
                    item.price_change_percentage_24h >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-50">
                Network Syncing...
              </div>
            )}
            <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2 group" asChild>
              <Link href="/market">
                Global market index <ArrowRight className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Asset Tracking List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Asset Breakdown
          </h3>
          <div className="grid gap-3">
            {assets.filter(a => a.amount > 0).length > 0 ? (
              assets.filter(a => a.amount > 0).map((asset) => (
                <Card key={asset.currency} className="hover:border-secondary transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-sm text-primary">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-semibold">{asset.currency}</div>
                        <div className="text-xs text-muted-foreground">{asset.amount.toFixed(4)} {asset.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${asset.fiatValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-xs text-green-500 font-medium">Synced</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl opacity-30 uppercase text-xs font-bold tracking-tighter">
                No active assets in vault
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-secondary" />
            Activity Ledger
          </h3>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.length > 0 ? (
                  transactions.slice(0, 4).map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          tx.type === 'receive' ? "bg-green-100 text-green-600" : 
                          tx.type === 'send' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                        )}>
                          {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : 
                           tx.type === 'send' ? <ArrowUpRight className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {tx.type === 'receive' ? 'Received' : tx.type === 'send' ? 'Sent' : 'Trade'} {tx.currency}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {tx.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-semibold text-sm",
                          tx.type === 'receive' ? "text-green-600" : "text-foreground"
                        )}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.currency}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mounted ? new Date(tx.timestamp).toLocaleDateString() : '...'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30 uppercase text-xs font-bold tracking-tighter">
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
