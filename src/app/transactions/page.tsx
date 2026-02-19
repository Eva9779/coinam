
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, History, AlertCircle, Zap } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const { assets, transactions, updateBalance, addTransaction, initialized } = useVaultStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  
  const [isSending, setIsSending] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [currency, setCurrency] = useState("BTC");
  const [addressError, setAddressError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateAddress = (addr: string) => {
    if (!addr) return "";
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{11,71}$/;
    
    if (currency === 'ETH' && !ethRegex.test(addr)) return "Invalid Ethereum network address";
    if (currency === 'BTC' && !btcRegex.test(addr)) return "Invalid Bitcoin network address";
    return "";
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateAddress(recipient);
    if (error) {
      setAddressError(error);
      return;
    }

    const val = parseFloat(amount);
    const asset = assets.find(a => a.currency === currency);
    if (!asset || val > asset.amount) {
      toast({ title: "Insufficient funds in vault", variant: "destructive" });
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      updateBalance(currency, -val, asset.fiatValueUSD / asset.amount);
      addTransaction({
        type: 'send',
        currency,
        amount: val,
        fiatValueUSD: val * (asset.fiatValueUSD / asset.amount),
        toAddress: recipient,
        description: `External transfer to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`
      });

      setIsSending(false);
      setAmount("");
      setRecipient("");
      toast({
        title: "Transaction Broadcasted",
        description: `Enclave confirmed ${val} ${currency} broadcast.`,
      });
    }, 2000);
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
      <div>
        <h2 className="text-3xl font-bold text-primary">Transaction Hub</h2>
        <p className="text-muted-foreground">Manage on-chain asset transfers and historical audit trails.</p>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="send" className="gap-2"><ArrowUpRight className="h-4 w-4" /> Send</TabsTrigger>
          <TabsTrigger value="receive" className="gap-2"><ArrowDownLeft className="h-4 w-4" /> Receive</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Initiate Transfer</CardTitle>
              <CardDescription>Securely broadcast assets to external network addresses.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Asset Source</Label>
                  <Select value={currency} onValueChange={(val) => { setCurrency(val); setAddressError(""); }}>
                    <SelectTrigger className="font-semibold">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(a => (
                        <SelectItem key={a.currency} value={a.currency}>
                          {a.currency} ({a.amount.toFixed(4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">Network Destination Address</Label>
                  <div className="space-y-1">
                    <Input 
                      id="recipient" 
                      placeholder={currency === 'ETH' ? "0x..." : "bc1..."} 
                      value={recipient}
                      onChange={(e) => { setRecipient(e.target.value); setAddressError(""); }}
                      className={cn(addressError && "border-destructive")}
                      required
                    />
                    {addressError && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {addressError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Transfer Volume</Label>
                  <div className="relative">
                    <Input 
                      id="amount" 
                      type="number" 
                      step="any"
                      placeholder="0.00" 
                      className="pr-16 text-lg font-bold h-12"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <div className="absolute right-3 top-3.5 text-sm font-bold text-muted-foreground">
                      {currency}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Gas</span>
                    <span className="font-medium">~0.00005 {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Throughput</span>
                    <span className="font-medium text-green-600">High Priority</span>
                  </div>
                </div>

                <Button type="submit" className="w-full py-6 text-lg gap-2 shadow-lg" disabled={isSending}>
                  {isSending ? (
                    <>Signing via Enclave...</>
                  ) : (
                    <><Send className="h-5 w-5" /> Sign and Broadcast</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
          <Card>
            <CardHeader>
              <CardTitle>Inbound Vault Endpoint</CardTitle>
              <CardDescription>Direct your assets to these secure vault-linked addresses.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-8 py-10">
              <div className="p-6 bg-white rounded-xl shadow-md border border-primary/10">
                <div className="h-48 w-48 bg-muted flex items-center justify-center relative overflow-hidden group">
                  <div className="grid grid-cols-4 gap-1 p-4 opacity-80">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={cn("h-8 w-8", (i % 3 === 0 || i % 5 === 1) ? "bg-primary" : "bg-transparent")} />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label>Mainnet {currency} Address</Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={assets.find(a => a.currency === currency)?.address || "Endpoint pending..."} 
                      className="font-mono text-xs bg-muted/50 font-bold" 
                    />
                    <Button size="icon" variant="outline" onClick={() => {
                      const addr = assets.find(a => a.currency === currency)?.address;
                      if (addr) {
                        navigator.clipboard.writeText(addr);
                        toast({ title: "Address copied to clipboard" });
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
          <Card>
            <CardHeader>
              <CardTitle>Vault Activity Ledger</CardTitle>
              <CardDescription>Immutable record of all internal and external asset movements.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.length > 0 ? transactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                        tx.type === 'receive' ? "bg-green-100 text-green-600" : 
                        tx.type === 'send' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-6 w-6" /> : 
                         tx.type === 'send' ? <ArrowUpRight className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {tx.type === 'receive' ? 'Deposit' : tx.type === 'send' ? 'Withdrawal' : 'Exchange'} {tx.currency}
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-sm text-muted-foreground">{tx.description}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-tight">SIG_HASH: {tx.id.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className={cn(
                        "text-lg font-bold",
                        tx.type === 'receive' ? "text-green-600" : "text-foreground"
                      )}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} {tx.currency.split(' ')[0]}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        ${tx.fiatValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-muted-foreground">
                    No ledger entries found.
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
