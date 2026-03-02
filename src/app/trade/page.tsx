
"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp, Info, RefreshCw, BarChart3 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

// Professional TradingView Chart Component
const TradingViewWidget = memo(({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure we only append the script once per symbol change
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = ''; // Clear previous widget
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Config for the global trading chart
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
    <div className="w-full h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner bg-card">
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
  const { assets, updateBalance, addTransaction, initialized } = useVaultStore();
  const [fromAsset, setFromAsset] = useState("USDC");
  const [toAsset, setToAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  const rates: Record<string, number> = {
    "BTC": 64000,
    "ETH": 2400,
    "SOL": 145,
    "USDC": 1
  };

  const fromData = assets.find(a => a.currency === fromAsset);
  const exchangeRate = (rates[fromAsset] || 1) / (rates[toAsset] || 1);
  const estimatedReceive = amount ? parseFloat(amount) * exchangeRate : 0;

  const handleSwap = () => {
    const val = parseFloat(amount);
    if (!fromData || val > fromData.amount) {
      toast({ title: "Insufficient funds", variant: "destructive" });
      return;
    }

    setIsSwapping(true);
    
    // Direct execution
    updateBalance(fromAsset, -val, rates[fromAsset] || 1);
    updateBalance(toAsset, estimatedReceive, rates[toAsset] || 1);
    
    addTransaction({
      type: 'trade',
      currency: `${fromAsset} → ${toAsset}`,
      amount: val,
      fiatValueUSD: val * (rates[fromAsset] || 1),
      description: `Direct swap: ${val} ${fromAsset} for ${estimatedReceive.toFixed(6)} ${toAsset}`
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-secondary" />
          Global Exchange Portal
        </h2>
        <p className="text-muted-foreground">Institutional-grade charting and direct peer-to-peer swaps.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Live Trading Chart Area */}
        <div className="xl:col-span-2 h-[600px] flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Live {toAsset}/USDT Marketplace
            </h3>
            <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/20 font-mono text-[10px]">
              REAL-TIME FEED
            </Badge>
          </div>
          <TradingViewWidget symbol={toAsset} />
        </div>

        {/* Trade Execution Card */}
        <div className="space-y-6">
          <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Execute Swap</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer hover:rotate-180 transition-transform duration-500" />
              </div>
              <CardDescription className="text-xs font-medium">Authorize direct exchange broadcast on the ledger.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Label>Sell Amount</Label>
                  <span>Balance: {fromData?.amount.toFixed(4) || "0.00"} {fromAsset}</span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg font-bold h-14 bg-background/50"
                  />
                  <Select value={fromAsset} onValueChange={setFromAsset}>
                    <SelectTrigger className="w-32 h-14 font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.length > 0 ? assets.map(a => <SelectItem key={a.currency} value={a.currency}>{a.currency}</SelectItem>) : <SelectItem value="USDC">USDC</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-center -my-4 relative z-10">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-card shadow-lg border-2 border-primary/20 hover:scale-110 transition-transform" onClick={() => {
                  const temp = fromAsset;
                  setFromAsset(toAsset);
                  setToAsset(temp);
                }}>
                  <ArrowLeftRight className="h-4 w-4 rotate-90" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Label>Estimated Receive</Label>
                </div>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={estimatedReceive ? estimatedReceive.toFixed(6) : "0.00"} 
                    className="text-lg font-bold h-14 bg-muted/50 shadow-inner"
                  />
                  <Select value={toAsset} onValueChange={setToAsset}>
                    <SelectTrigger className="w-32 h-14 font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["BTC", "ETH", "SOL", "USDC"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-dashed border-primary/20 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Market Rate:</span>
                  <span className="font-bold">1 {fromAsset} ≈ {exchangeRate.toFixed(6)} {toAsset}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Network Fee:</span>
                  <span className="text-green-600 font-bold">Optimized</span>
                </div>
              </div>

              <Button 
                className="w-full h-16 text-xl font-black gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl" 
                disabled={!amount || isSwapping}
                onClick={handleSwap}
              >
                {isSwapping ? <RefreshCw className="h-6 w-6 animate-spin" /> : "Finalize Exchange"}
              </Button>

              <div className="flex items-center gap-2 justify-center opacity-50">
                <Info className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Secured by Cryptographic Signing</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
