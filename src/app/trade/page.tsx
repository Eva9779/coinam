
"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, TrendingUp, Info, RefreshCw, BarChart3 } from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

// Professional TradingView Chart Component
const TradingViewWidget = memo(({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = ''; // Clear previous widget
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    const config = {
      autosize: true,
      symbol: `BINANCE:${symbol}USDT`,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com"
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-full min-h-[350px] sm:min-h-[500px] border rounded-2xl overflow-hidden shadow-inner bg-card">
      <div 
        ref={containerRef} 
        className="tradingview-widget-container" 
        style={{ height: "100%", width: "100%" }}
      >
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
      </div>
    </div>
  );
});

TradingViewWidget.displayName = "TradingViewWidget";

export default function TradePage() {
  const { assets, updateBalance, addTransaction, initialized } = useWalletStore();
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAsset, setToAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    if (initialized && assets.length > 0 && !fromAssetId) {
      const usdc = assets.find(a => a.currency === 'USDC');
      setFromAssetId(usdc?.id || assets[0].id);
    }
  }, [initialized, assets, fromAssetId]);

  const rates: Record<string, number> = {
    "BTC": 64000,
    "ETH": 2400,
    "SOL": 145,
    "USDC": 1
  };

  const fromData = assets.find(a => a.id === fromAssetId);
  const fromCurrency = fromData?.currency || "USDC";
  const exchangeRate = (rates[fromCurrency] || 1) / (rates[toAsset] || 1);
  const estimatedReceive = amount ? parseFloat(amount) * exchangeRate : 0;

  const handleSwap = () => {
    const val = parseFloat(amount);
    if (!fromData || val > fromData.amount) {
      toast({ title: "Insufficient funds", variant: "destructive" });
      return;
    }

    setIsSwapping(true);
    
    // Direct execution
    updateBalance(fromCurrency, -val, rates[fromCurrency] || 1);
    updateBalance(toAsset, estimatedReceive, rates[toAsset] || 1);
    
    addTransaction({
      type: 'trade',
      currency: `${fromCurrency} → ${toAsset}`,
      amount: val,
      fiatValueUSD: val * (rates[fromCurrency] || 1),
      description: `Direct swap: ${val} ${fromCurrency} for ${estimatedReceive.toFixed(6)} ${toAsset}`
    });

    setIsSwapping(false);
    setAmount("");
    toast({ 
      title: "Exchange Finalized", 
      description: `Network broadcast complete.` 
    });
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
          <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
          Market Portal
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">Institutional-grade charting and direct peer-to-peer swaps.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 items-start">
        <div className="xl:col-span-2 h-[450px] sm:h-[600px] flex flex-col space-y-4">
          <div className="flex items-center justify-between px-1 sm:px-2">
            <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
              Live {toAsset}/USDT Feed
            </h3>
            <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/20 font-mono text-[9px] sm:text-[10px]">
              REAL-TIME
            </Badge>
          </div>
          <TradingViewWidget symbol={toAsset} />
        </div>

        <div className="space-y-6">
          <Card className="shadow-xl border-primary/10 bg-card/50 backdrop-blur-md rounded-2xl sm:rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl font-bold">Execute Swap</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer hover:rotate-180 transition-transform duration-500" />
              </div>
              <CardDescription className="text-[10px] sm:text-xs font-medium">Authorize direct exchange broadcast on the ledger.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Label>Sell Amount</Label>
                  <span className="truncate max-w-[120px]">Bal: {fromData?.amount.toFixed(4) || "0.00"}</span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-base sm:text-lg font-bold h-12 sm:h-14 bg-background/50 rounded-xl"
                  />
                  <Select value={fromAssetId} onValueChange={setFromAssetId}>
                    <SelectTrigger className="w-24 sm:w-32 h-12 sm:h-14 font-bold rounded-xl shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.length > 0 ? assets.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.currency} ({a.address.slice(0, 4)}...)
                        </SelectItem>
                      )) : (
                        <SelectItem value="USDC">USDC</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-center -my-3 sm:-my-4 relative z-10">
                <Button variant="outline" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 bg-card shadow-lg border-2 border-primary/20 hover:scale-110 transition-transform">
                  <ArrowLeftRight className="h-4 w-4 rotate-90" />
                </Button>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Label>Receive Est.</Label>
                </div>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={estimatedReceive ? estimatedReceive.toFixed(6) : "0.00"} 
                    className="text-base sm:text-lg font-bold h-12 sm:h-14 bg-muted/50 shadow-inner rounded-xl"
                  />
                  <Select value={toAsset} onValueChange={setToAsset}>
                    <SelectTrigger className="w-24 sm:w-32 h-12 sm:h-14 font-bold rounded-xl shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["BTC", "ETH", "SOL", "USDC"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-primary/5 rounded-xl border border-dashed border-primary/20 space-y-1 sm:space-y-2">
                <div className="flex justify-between text-[10px] sm:text-xs font-medium">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-bold">1 {fromCurrency} ≈ {exchangeRate.toFixed(4)} {toAsset}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs font-medium">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="text-green-600 font-bold">Optimized</span>
                </div>
              </div>

              <Button 
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-black gap-2 sm:gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl sm:rounded-2xl" 
                disabled={!amount || isSwapping}
                onClick={handleSwap}
              >
                {isSwapping ? <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : "Authorize Exchange"}
              </Button>

              <div className="flex items-center gap-2 justify-center opacity-50">
                <Info className="h-3 w-3" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Secured by Hardware Enclave</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
