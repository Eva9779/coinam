
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, History, AlertCircle, Zap, ShieldCheck, Database, Copy, Loader2 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getLiveGasPrice, sendLiveTransaction } from "@/lib/blockchain";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';

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
      setBaseGas(gwei);
    }
    fetchFees();
    const interval = setInterval(fetchFees, 30000);
    return () => clearInterval(interval);
  }, []);

  const getGasEstimate = () => {
    const gasLimit = 21000;
    const currentGas = baseGas || 20; 
    const multiplier = feeTier === 'slow' ? 0.9 : feeTier === 'fast' ? 1.5 : 1.1;
    const ethFee = (gasLimit * (currentGas * multiplier)) / 1e9;
    return ethFee;
  };

  const validateAddress = (addr: string) => {
    if (!addr) return "";
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(addr)) return "Invalid destination address for Mainnet broadcast";
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
      toast({ title: "Insufficient balance on mainnet ledger", variant: "destructive" });
      return;
    }

    if (!asset.privateKey) {
      toast({ 
        title: "Legacy Wallet Endpoint", 
        description: "Please provision a new Mainnet Key in the Wallet tab to enable signing.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    
    try {
      // 1. Blockchain Broadcast
      const txHash = await sendLiveTransaction(asset.privateKey, recipient, amount);
      
      toast({
        title: "Broadcast Finalized",
        description: `Network Signature: ${txHash.slice(0, 16)}...`,
      });

      // 2. Ledger Update (Handled separately to avoid masking broadcast success)
      try {
        await updateBalance(currency, -val, asset.fiatValueUSD / Math.max(asset.amount, 1));
        await addTransaction({
          type: 'send',
          currency,
          amount: val,
          fiatValueUSD: val * (asset.fiatValueUSD / Math.max(asset.amount, 1)),
          toAddress: recipient,
          description: `Network Broadcast | Hash: ${txHash.slice(0, 10)}...`
        });
      } catch (ledgerError) {
        toast({
          title: "Ledger Update Delayed",
          description: "Transaction confirmed on-chain. Syncing local ledger records...",
        });
      }

      setAmount("");
      setRecipient("");
    } catch (err: any) {
      toast({
        title: "Broadcast Failed",
        description: err.message || "Failed to transmit transaction to the peer network.",
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

  const receiveAddress = assets.find(a => a.currency === currency)?.address || "";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Database className="h-8 w-8 text-secondary" />
            Mainnet Gateway
          </h2>
          <p className="text-muted-foreground text-sm">Direct broadcast interface to decentralized peer networks.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
            {baseGas > 0 ? `Network Live: ${baseGas.toFixed(1)} Gwei` : 'Synchronizing Fees...'}
          </span>
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
                Sign & Transmit
              </CardTitle>
              <CardDescription className="text-xs">Finalize and transmit assets directly to the decentralized ledger.</CardDescription>
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
                          <SelectItem key={a.address} value={a.currency}>
                            {a.currency} ({a.amount.toFixed(4)}) - {a.address.slice(0, 6)}...
                          </SelectItem>
                        )) : (
                          <SelectItem value="ETH" disabled>No active assets provisioned</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs uppercase tracking-widest font-bold opacity-70">Transfer Volume</Label>
                    <div className="relative">
                      <input 
                        id="amount" 
                        type="number" 
                        step="any"
                        placeholder="0.00" 
                        className="flex h-12 w-full rounded-md border border-primary/10 bg-background/50 px-3 py-2 pr-16 text-xl font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <input 
                      id="recipient" 
                      placeholder="0x..." 
                      value={recipient}
                      onChange={(e) => { setRecipient(e.target.value); setAddressError(""); }}
                      className={cn("flex h-12 w-full rounded-md border bg-background/50 px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", addressError ? "border-destructive" : "border-input")}
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
                  <Label className="text-xs uppercase tracking-widest font-bold opacity-70">Priority Level</Label>
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
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Estimated</span>
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
                  {isSending ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="h-6 w-6" /> Finalize Broadcast</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl">Network Entrypoint</CardTitle>
              <CardDescription className="text-xs">Incoming transfers are credited after confirmation on the global ledger.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-8 py-10">
              <div className="p-8 bg-white rounded-3xl shadow-2xl border border-primary/5">
                {receiveAddress ? (
                  <QRCodeSVG 
                    value={receiveAddress} 
                    size={224} 
                    level="H"
                    includeMargin={false}
                  />
                ) : (
                  <div className="h-56 w-56 bg-muted flex items-center justify-center rounded-2xl text-center p-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Awaiting Address Synchronization...</span>
                  </div>
                )}
              </div>
              
              <div className="w-full space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Mainnet Receiving Endpoint</Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={receiveAddress || "Synchronizing..."} 
                      className="font-mono text-xs bg-muted/50 font-bold h-12 shadow-inner" 
                    />
                    <Button size="icon" variant="outline" className="h-12 w-12 rounded-xl" onClick={() => {
                      if (receiveAddress) {
                        navigator.clipboard.writeText(receiveAddress);
                        toast({ title: "Address copied" });
                      }
                    }}>
                      <Copy className="h-4 w-4" />
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
                      <div className="text-xs text-muted-foreground mt-1">
                        {mounted ? new Date(tx.timestamp).toLocaleDateString() : '...'}
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
