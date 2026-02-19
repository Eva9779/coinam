
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, History, AlertCircle } from "lucide-react";
import { MOCK_TRANSACTIONS } from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
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
    // Basic regex for common address formats (Simplified)
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{11,71}$/;
    
    if (currency === 'ETH' && !ethRegex.test(addr)) return "Invalid Ethereum address format";
    if (currency === 'BTC' && !btcRegex.test(addr)) return "Invalid Bitcoin address format";
    return "";
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateAddress(recipient);
    if (error) {
      setAddressError(error);
      return;
    }

    if (!amount || !recipient) return;
    
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setAmount("");
      setRecipient("");
      toast({
        title: "Transaction Broadcasted",
        description: `Successfully sent ${amount} ${currency} to ${recipient.slice(0, 10)}...`,
      });
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary">Transaction Hub</h2>
        <p className="text-muted-foreground">Manage on-chain transfers and history.</p>
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
              <CardTitle>Send Assets</CardTitle>
              <CardDescription>Initiate a secure transfer to another wallet.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Asset</Label>
                  <Select value={currency} onValueChange={(val) => { setCurrency(val); setAddressError(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      <SelectItem value="SOL">Solana (SOL)</SelectItem>
                      <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
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
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <Input 
                      id="amount" 
                      type="number" 
                      step="any"
                      placeholder="0.00" 
                      className="pr-16"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-sm font-bold text-muted-foreground">
                      {currency}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Fee</span>
                    <span className="font-medium">~0.00005 {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Speed</span>
                    <span className="font-medium text-green-600">Standard</span>
                  </div>
                </div>

                <Button type="submit" className="w-full py-6 text-lg gap-2" disabled={isSending}>
                  {isSending ? (
                    <>Processing Transaction...</>
                  ) : (
                    <><Send className="h-5 w-5" /> Confirm and Send</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Assets</CardTitle>
              <CardDescription>Use your public address to receive assets.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-8 py-10">
              <div className="p-6 bg-white rounded-xl shadow-inner border">
                <div className="h-48 w-48 bg-muted flex items-center justify-center relative overflow-hidden group cursor-pointer">
                  <div className="grid grid-cols-4 gap-1 p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={cn("h-8 w-8", (i % 3 === 0 || i % 5 === 0) ? "bg-primary" : "bg-transparent")} />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label>Public {currency} Address</Label>
                  <div className="flex gap-2">
                    <Input readOnly value="bc1qxy2kg36dn52cc5tx0hhaasdg78489" className="font-mono text-xs bg-muted" />
                    <Button size="icon" variant="outline" onClick={() => {
                      navigator.clipboard.writeText("bc1qxy2kg36dn52cc5tx0hhaasdg78489");
                      toast({ title: "Copied to clipboard" });
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
              <CardTitle>Activity Ledger</CardTitle>
              <CardDescription>Historical record of all wallet activity.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_TRANSACTIONS.map((tx) => (
                  <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                        tx.type === 'receive' ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {tx.type === 'receive' ? 'Deposit' : 'Withdrawal'} {tx.currency}
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-sm text-muted-foreground">{tx.description}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">TXID: {tx.id}</div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className={cn(
                        "text-lg font-bold",
                        tx.type === 'receive' ? "text-green-600" : "text-foreground"
                      )}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.currency}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        ${tx.fiatValueUSD.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {mounted ? new Date(tx.timestamp).toLocaleString() : '...'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
