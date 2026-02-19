
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp, Info, RefreshCw } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

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
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary">Exchange Portal</h2>
        <p className="text-muted-foreground">Direct swaps with institutional-grade pricing.</p>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Execute Trade</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer hover:rotate-180 transition-transform duration-500" />
          </div>
          <CardDescription>Authorize direct exchange broadcast.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <Label>Sell</Label>
              <span className="text-muted-foreground">Available: {fromData?.amount.toFixed(4) || "0.00"} {fromAsset}</span>
            </div>
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold h-12"
              />
              <Select value={fromAsset} onValueChange={setFromAsset}>
                <SelectTrigger className="w-32 h-12 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.length > 0 ? assets.map(a => <SelectItem key={a.currency} value={a.currency}>{a.currency}</SelectItem>) : <SelectItem value="USDC">USDC</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <Button variant="outline" size="icon" className="rounded-full bg-card shadow-sm border-2" onClick={() => {
              const temp = fromAsset;
              setFromAsset(toAsset);
              setToAsset(temp);
            }}>
              <ArrowLeftRight className="h-4 w-4 rotate-90" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <Label>Buy</Label>
            </div>
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={estimatedReceive ? estimatedReceive.toFixed(6) : "0.00"} 
                className="text-lg font-bold h-12 bg-muted/30"
              />
              <Select value={toAsset} onValueChange={setToAsset}>
                <SelectTrigger className="w-32 h-12 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["BTC", "ETH", "SOL", "USDC"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg gap-2 shadow-lg" 
            disabled={!amount || isSwapping}
            onClick={handleSwap}
          >
            {isSwapping ? "Executing..." : "Finalize Exchange"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
