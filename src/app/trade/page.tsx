
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

  // Mock rates for the prototype
  const rates: Record<string, number> = {
    "BTC": 64000,
    "ETH": 2400,
    "SOL": 145,
    "USDC": 1
  };

  const fromData = assets.find(a => a.currency === fromAsset);
  const exchangeRate = rates[fromAsset] / rates[toAsset];
  const estimatedReceive = amount ? parseFloat(amount) * exchangeRate : 0;

  const handleSwap = () => {
    const val = parseFloat(amount);
    if (!fromData || val > fromData.amount) {
      toast({ title: "Insufficient funds", variant: "destructive" });
      return;
    }

    setIsSwapping(true);
    setTimeout(() => {
      updateBalance(fromAsset, -val, rates[fromAsset]);
      updateBalance(toAsset, estimatedReceive, rates[toAsset]);
      
      addTransaction({
        type: 'trade',
        currency: `${fromAsset} → ${toAsset}`,
        amount: val,
        fiatValueUSD: val * rates[fromAsset],
        description: `Swapped ${val} ${fromAsset} for ${estimatedReceive.toFixed(6)} ${toAsset}`
      });

      setIsSwapping(false);
      setAmount("");
      toast({ 
        title: "Trade Successful", 
        description: `Exchanged ${val} ${fromAsset} for ${toAsset}.` 
      });
    }, 1500);
  };

  if (!initialized) return null;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary">Instant Trade</h2>
        <p className="text-muted-foreground">Exchange assets instantly with competitive rates.</p>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Swap</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer hover:rotate-180 transition-transform duration-500" />
          </div>
          <CardDescription>Trade your crypto assets securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* FROM */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <Label>From</Label>
              <span className="text-muted-foreground">Balance: {fromData?.amount.toFixed(4)} {fromAsset}</span>
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
                <SelectTrigger className="w-32 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(a => <SelectItem key={a.currency} value={a.currency}>{a.currency}</SelectItem>)}
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

          {/* TO */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <Label>To (Estimated)</Label>
            </div>
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={estimatedReceive ? estimatedReceive.toFixed(6) : "0.00"} 
                className="text-lg font-bold h-12 bg-muted/30"
              />
              <Select value={toAsset} onValueChange={setToAsset}>
                <SelectTrigger className="w-32 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["BTC", "ETH", "SOL", "USDC"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-medium">1 {fromAsset} = {exchangeRate.toFixed(6)} {toAsset}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slippage Tolerance</span>
              <span className="font-medium">0.5%</span>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg gap-2" 
            disabled={!amount || isSwapping}
            onClick={handleSwap}
          >
            {isSwapping ? "Executing Trade..." : "Swap Assets"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30 border-none">
          <CardContent className="p-4 flex items-center gap-4">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <div className="text-sm">
              <div className="font-semibold">Best Price Found</div>
              <div className="text-muted-foreground">Optimized via liquidity nodes</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none">
          <CardContent className="p-4 flex items-center gap-4">
            <Info className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <div className="font-semibold">Secure Swap</div>
              <div className="text-muted-foreground">Direct enclave execution</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
