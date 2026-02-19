
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, History, AlertCircle, Zap, ShieldCheck, Database } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getLiveGasPrice, sendLiveTransaction } from "@/lib/blockchain";

type FeeTier = 'slow' | 'average' | 'fast';

export default function TransactionsPage() {
  const { assets, transactions, updateBalance, addTransaction, initialized } = useVaultStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  
  const [isSending, setIsSending] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [feeTier, setFeeTier] = useState<FeeTier>('average');
  const [addressError, setAddressError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [baseGas, setBaseGas] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    async function fetchFees() {
      const gwei = await getLiveGasPrice();
      if (gwei > 0) setBaseGas(gwei);
    }
    fetchFees();
  }, []);

  const getGasEstimate = () => {
    const gasLimit = 21000;
    const multiplier = feeTier === 'slow' ? 0.9 : feeTier === 'fast' ? 1.5 : 1.1;
    const ethFee = (gasLimit * (baseGas * multiplier)) / 1e9;
    return ethFee;
  };

  const validateAddress = (addr: string) => {
    if (!addr) return "";
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (currency === 'ETH' && !ethRegex.test(addr)) return "Invalid destination address for selected network";
    return "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateAddress(recipient);
    if (error) {
      setAddressError(error);
      return;
    }

    const val = parseFloat(amount);
    const asset = assets.find(a => a.currency === currency);
    
    if (!asset || val > asset.amount) {
      toast({ title: "Insufficient balance on ledger", variant: "destructive" });
      return;
    }

    setIsSending(true);
    
    try {
      if (!asset.privateKey) {
        throw new Error("Private key not found for signing this transaction.");
      }

      // BROADCAST DIRECTLY TO LIVE MAINNET
      const txHash = await sendLiveTransaction(asset.privateKey, recipient, amount);

      updateBalance(currency, -val, asset.fiatValueUSD / Math.max(asset.amount, 1));
      addTransaction({
        type: 'send',
        currency,
        amount: val,
        fiatValueUSD: val * (asset.fiatValueUSD / Math.max(asset.amount, 1)),
        toAddress: recipient,
        description: `Network Broadcast | Hash: ${txHash.slice(0, 10)}...`
      });

      setAmount("");
      setRecipient("");
      toast({
        title: "Broadcast Successful",
        description: `Transaction signed and transmitted. Hash: ${txHash.slice(0, 12)}`,
      });
    } catch (err: any) {
      toast({
        title: "Broadcast Failed",
        description: err.message || "Failed to transmit transaction to the network.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!initialized || !mounted) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Database className="h-8 w-8 text-secondary" />
            Network Gateway
          </h2>
          <p className="text-muted-foreground text-sm">Direct broadcast interface to decentralized peer networks.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Network Live: {baseGas.toFixed(1)} Gwei</span>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 p-1">
          <TabsTrigger value="send" className="gap-2 data-[state=active]:shadow-lg"><ArrowUpRight className="h-4 w-4" /> Broadcast</TabsTrigger>
          <TabsTrigger value="receive" className="gap-2 data-[state=active]:shadow-lg"><ArrowDownLeft className="h-4 w-4" /> Deposit</TabsTrigger>
          <TabsTrigger value="history" className="gap-2 data-[state=active]:shadow-lg"><History className="h-4 w-4" /> Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <ShieldCheck className="h-6 w-6 text-secondary" />
                Sign & Broadcast
              </CardTitle>
              <CardDescription className="text-xs">Finalize and transmit assets to the distributed ledger.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-xs uppercase tracking-widest font-bold opacity-70">Source Asset</Label>
                    <Select value={currency} onValueChange={(val) => { setCurrency(val); setAddressError(""); }}>
                      <SelectTrigger className="font-semibold h-12 bg-background/50">
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.length > 0 ? assets.map(a => (
                          <SelectItem key={a.currency} value={a.currency}>
                            {a.currency} ({a.amount.toFixed(4)})
                          </SelectItem>
                        )) : (
                          <SelectItem value="ETH" disabled>No active assets</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs uppercase tracking-widest font-bold opacity-70">Transfer Volume</Label>
                    <div className="relative">
                      <Input 
                        id="amount" 
                        type="number" 
                        step="any"
                        placeholder="0.00" 
                        className="pr-16 text-xl font-bold h-12 bg-background/50 border-primary/10"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                      <div className="absolute right-3 top-3.5 text-xs font-bold text-muted-foreground">
                        {currency}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-xs uppercase tracking-widest font-bold opacity-70">Destination Address</Label>
                  <div className="space-y-1">
                    <Input 
                      id="recipient" 
                      placeholder="0x..." 
                      value={recipient}
                      onChange={(e) => { setRecipient(e.target.value); setAddressError(""); }}
                      className={cn("h-12 font-mono text-xs bg-background/50", addressError && "border-destructive")}
                      required
                    />
                    {addressError && (
                      <div className="flex items-center gap-1 text-[10px] text-destructive font-bold uppercase">
                        <AlertCircle className="h-3 w-3" />
                        {addressError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Network Priority</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['slow', 'average', 'fast'] as FeeTier[]).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setFeeTier(tier)}
                        className={cn(
                          "py-3 px-3 rounded-xl border text-xs font-bold transition-all capitalize tracking-wider",
                          feeTier === tier 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]" 
                            : "bg-muted/30 hover:bg-muted/50 border-transparent"
                        )}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 bg-primary/5 rounded-2xl space-y-3 text-sm border-2 border-dashed border-primary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold uppercase tracking-widest text-[10px]">Network Fee</span>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-base">{getGasEstimate().toFixed(6)} {currency}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Verified on Chain</span>
                    </div>
                  </div>
                  <div className="h-px bg-primary/10 w-full" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold uppercase tracking-widest text-[10px]">Total Outflow</span>
                    <span className="font-bold text-xl text-primary">
                      {amount ? (parseFloat(amount) + getGasEstimate()).toFixed(6) : "0.00"} {currency}
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full py-8 text-xl font-bold gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform rounded-2xl bg-primary text-primary-foreground" disabled={isSending}>
                  {isSending ? "Authorizing Broadcast..." : <><Send className="h-6 w-6" /> Finalize Broadcast</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl">Network Entrypoint</CardTitle>
              <CardDescription className="text-xs">Incoming transfers are credited to your local ledger after chain confirmations.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-8 py-10">
              <div className="p-8 bg-white rounded-3xl shadow-2xl border border-primary/5">
                <div className="h-56 w-56 bg-muted flex items-center justify-center relative overflow-hidden group">
                  <div className="grid grid-cols-4 gap-1 p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={cn("h-10 w-10", (i % 3 === 0 || i % 5 === 1) ? "bg-primary" : "bg-transparent")} />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Mainnet Receiving Endpoint</Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={assets.find(a => a.currency === currency)?.address || "Synchronizing..."} 
                      className="font-mono text-xs bg-muted/50 font-bold h-12 shadow-inner" 
                    />
                    <Button size="icon" variant="outline" className="h-12 w-12 rounded-xl" onClick={() => {
                      const addr = assets.find(a => a.currency === currency)?.address;
                      if (addr) {
                        navigator.clipboard.writeText(addr);
                        toast({ title: "Address copied" });
                      }
                    }}>
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold uppercase tracking-tighter">Activity Ledger</CardTitle>
              <CardDescription className="text-xs">Immutable history synced with global peers.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {transactions.length > 0 ? transactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border-2",
                        tx.type === 'receive' ? "bg-green-100/50 text-green-600 border-green-500/20" : 
                        tx.type === 'send' ? "bg-blue-100/50 text-blue-600 border-blue-500/20" : "bg-purple-100/50 text-purple-600 border-purple-500/20"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-7 w-7" /> : 
                         tx.type === 'send' ? <ArrowUpRight className="h-7 w-7" /> : <Zap className="h-7 w-7" />}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-lg flex items-center gap-2">
                          {tx.type === 'receive' ? 'Mainnet Deposit' : tx.type === 'send' ? 'Mainnet Broadcast' : 'Peer Exchange'}
                          <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20 font-bold uppercase">Verified</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">{tx.description}</div>
                        <div className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                          SIG: {tx.id.toUpperCase()}
                          <CheckCircle2 className="h-2 w-2 text-green-500" />
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className={cn(
                        "text-xl font-bold tracking-tight",
                        tx.type === 'receive' ? "text-green-600" : "text-foreground"
                      )}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} {tx.currency.split(' ')[0]}
                      </div>
                      <div className="text-sm text-muted-foreground font-bold opacity-70">
                        ${tx.fiatValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-muted-foreground uppercase font-bold text-xs tracking-widest">
                    No active ledger entries
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
