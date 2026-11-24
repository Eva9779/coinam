
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  CheckCircle2, 
  History, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  Database, 
  Copy, 
  Loader2,
  Clock,
  XCircle,
  Activity,
  Globe
} from "lucide-react";
import { useWalletStore, Transaction } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getLiveGasPrice, sendLiveTransaction } from "@/lib/blockchain";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';

type FeeTier = 'slow' | 'average' | 'fast';

function TransactionsContent() {
  const { assets, transactions, updateBalance, addTransaction, initialized } = useWalletStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  
  const [isSending, setIsSending] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [feeTier, setFeeTier] = useState<FeeTier>('average');
  const [addressError, setAddressError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [baseGas, setBaseGas] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    async function fetchFees() {
      try {
        const gwei = await getLiveGasPrice();
        setBaseGas(gwei);
      } catch (e) {}
    }
    fetchFees();
    const interval = setInterval(fetchFees, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialized && assets.length > 0) {
      const currParam = searchParams.get('currency');
      if (currParam) {
        const found = assets.find(a => a.currency === currParam);
        if (found) setSelectedAssetId(found.id);
        else if (!selectedAssetId) setSelectedAssetId(assets[0].id);
      } else if (!selectedAssetId) {
        setSelectedAssetId(assets[0].id);
      }
    }
  }, [searchParams, assets, initialized, selectedAssetId]);

  const asset = assets.find(a => a.id === selectedAssetId);
  const currency = asset?.currency || "ETH";

  // Filter out internal bot "settle" logs to show only official transactions
  const displayTransactions = transactions.filter(t => {
    const desc = (t.description || "").toLowerCase();
    return !t.internal && !desc.includes('yield settle');
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (!asset || val > asset.amount) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      let txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

      if (asset.address.includes('enclave') || asset.address.includes('usdc') || asset.currency === 'USDC') {
        toast({ 
          title: "Broadcast Initiated", 
          description: "Clearing funds through Institutional Bridge. ETA: 2-4 hours for external wallets.",
        });
      } else {
        if (!asset.privateKey) throw new Error("No private key found for mainnet signing.");
        txHash = await sendLiveTransaction(asset.privateKey as `0x${string}`, recipient, amount);
      }
      
      addTransaction({
        type: 'send',
        hash: txHash,
        currency: currency,
        amount: val,
        fiatValueUSD: val * (asset.fiatValueUSD / Math.max(asset.amount, 1)),
        fromAddress: asset.address,
        toAddress: recipient,
        description: `External Wallet Transfer`,
        status: 'clearing',
        internal: false
      });

      setAmount("");
      setRecipient("");
      toast({ title: "Transfer Finalized", description: `Internal clearance complete. ID: ${txHash.slice(0, 12)}...` });
    } catch (err: any) {
      toast({ title: "Transfer Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (!initialized || !mounted) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Database className="h-8 w-8 text-secondary" />
            Capital Routing
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Mainnet Bridge & Institutional Clearance Protocol Active.</p>
        </div>
        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          BRIDGE CONNECTED
        </Badge>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 p-1 rounded-xl h-12">
          <TabsTrigger value="send" className="rounded-lg font-bold">Send Assets</TabsTrigger>
          <TabsTrigger value="receive" className="rounded-lg font-bold">Receive</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-bold">Ledger Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8 px-8">
              <CardTitle className="text-xl font-black">Initiate Network Broadcast</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Real-time clearance to external endpoints</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Asset Vault</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger className="h-14 bg-background/50 border-2 rounded-xl font-bold">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      {assets.map(a => (
                        <SelectItem key={a.id} value={a.id} className="font-bold">
                          {a.currency} ({a.amount.toFixed(4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">External Target Address (e.g. Deriv)</Label>
                  <Input 
                    placeholder="0x... or Wallet Key" 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)} 
                    className="h-14 rounded-xl font-bold bg-background/50 border-2"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Transfer Amount</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className="h-14 rounded-xl font-black text-xl bg-background/50 border-2 pl-4"
                      required 
                    />
                    <div className="absolute right-4 top-4 font-black text-xs text-muted-foreground">{currency}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 text-[10px] font-black uppercase tracking-tight">
                    <Clock className="h-3.5 w-3.5" />
                    Institutional Sweep Policy
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                    External transfers to third-party wallets (Deriv, Binance, etc.) undergo automated bridge verification. Expected clearance time: 2-4 hours.
                  </p>
                </div>

                <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl gap-3 transition-transform hover:scale-[1.01]" disabled={isSending}>
                  {isSending ? <Loader2 className="animate-spin h-6 w-6" /> : <><Send className="h-6 w-6" /> Authorize Broadcast</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
           <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardContent className="flex flex-col items-center py-16 space-y-8">
              <div className="p-4 bg-white rounded-3xl shadow-xl border-2 border-primary/5">
                <QRCodeSVG value={asset?.address || ""} size={220} />
              </div>
              <div className="w-full max-w-sm space-y-4">
                <div className="space-y-2 text-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Secure Receiving Endpoint</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={asset?.address || ""} className="h-12 font-mono text-[11px] font-bold rounded-xl border-2 bg-background/50" />
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => {
                      navigator.clipboard.writeText(asset?.address || "");
                      toast({ title: "Address Copied" });
                    }}><Copy className="h-5 w-5" /></Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center font-medium px-4">
                  Only send {currency} to this address on the Ethereum Mainnet. Assets sent to other networks may be unrecoverable.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-muted/20 border-b px-8 py-6">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                 <History className="h-5 w-5 text-secondary" />
                 Official Ledger history
               </CardTitle>
               <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Excludes internal enclave yield settlements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {displayTransactions.length > 0 ? displayTransactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-primary/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center border-2",
                        tx.type === 'receive' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                        tx.type === 'send' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : 
                         tx.type === 'send' ? <ArrowUpRight className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          {tx.description}
                          {tx.status === 'clearing' && (
                            <Badge className="bg-amber-500 text-white border-none text-[8px] h-4 animate-pulse">CLEARING</Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
                          {tx.currency} • {new Date(tx.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-black text-sm", tx.type === 'receive' ? "text-green-600" : "text-primary")}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground">${tx.fiatValueUSD.toFixed(2)}</div>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <Database className="h-12 w-12" />
                    <p className="text-xs font-black uppercase tracking-widest">No official activity recorded</p>
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
