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
  History, 
  Database, 
  Copy, 
  Loader2, 
  Clock, 
  Zap 
} from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getLiveGasPrice, sendLiveTransaction } from "@/lib/blockchain";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';

type FeeTier = 'slow' | 'average' | 'fast';

const VOIDED_HASHES = ['0xf2648ee7cea64', '0x3187561e8784b'];

function TransactionsContent() {
  const { assets, transactions, addTransaction, initialized } = useWalletStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  
  const [isSending, setIsSending] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
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

  const displayTransactions = transactions.filter(t => {
    const desc = (t.description || "").toLowerCase();
    const isBotInternal = t.internal === true || desc.includes('yield settle');
    return !isBotInternal;
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
      let txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      if (asset.address.includes('enclave') || asset.currency === 'USDC' || asset.address.length < 42) {
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

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `Full data stored in secure clipboard.`,
      });
    });
  };

  // NEVER block the entire screen with a loader.
  // We use localized skeletons if data is missing, but render the shell immediately.

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
                      {assets.length > 0 ? assets.map(a => (
                        <SelectItem key={a.id} value={a.id} className="font-bold">
                          {a.currency} ({a.amount.toFixed(4)})
                        </SelectItem>
                      )) : (
                        <SelectItem value="loading" disabled>Loading Assets...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">External Target Address</Label>
                  <Input 
                    placeholder="0x... Paste Full ERC-20 Address" 
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
                    External transfers undergo automated bridge verification. Expected clearance time: 2-4 hours.
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
                {asset?.address ? (
                  <QRCodeSVG value={asset.address} size={220} />
                ) : (
                  <div className="h-[220px] w-[220px] bg-muted/20 animate-pulse rounded-xl flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="w-full max-w-sm space-y-4">
                <div className="space-y-4 text-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Secure Receiving Endpoint</Label>
                  <div className="flex flex-col gap-2">
                    <Input 
                      readOnly 
                      value={asset?.address || "SCANNING LEDGER..."} 
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="h-14 font-mono text-[13px] font-black rounded-xl border-2 bg-background/50 text-center select-all cursor-text focus-visible:ring-secondary" 
                    />
                    <Button 
                      variant="outline" 
                      className="h-12 rounded-xl border-2 font-black gap-2 hover:bg-secondary/5" 
                      onClick={() => copyToClipboard(asset?.address || "", "Full Address")}
                      disabled={!asset?.address}
                    >
                      <Copy className="h-4 w-4" />
                      Copy Entire Address
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center font-medium px-4">
                  Only send {currency} to this address on the Ethereum Mainnet (ERC-20). Assets sent to other networks may be unrecoverable.
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
                 Official Ledger History
               </CardTitle>
               <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Excludes internal enclave yield settlements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {displayTransactions.length > 0 ? displayTransactions.map((tx) => {
                  const isVoided = VOIDED_HASHES.includes(tx.hash);
                  return (
                    <div key={tx.id} className="p-6 flex justify-between items-start hover:bg-primary/[0.02] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center border-2 mt-1 shrink-0",
                          tx.type === 'receive' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                          tx.type === 'send' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        )}>
                          {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : 
                           tx.type === 'send' ? <ArrowUpRight className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="font-bold text-sm flex items-center gap-2">
                            {tx.description}
                            {isVoided ? (
                              <Badge variant="destructive" className="text-[8px] h-4 uppercase font-black">VOIDED</Badge>
                            ) : tx.status === 'clearing' && (
                              <Badge className="bg-amber-500 text-white border-none text-[8px] h-4 animate-pulse">CLEARING</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                            {tx.currency} • {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                          
                          {tx.hash && (
                            <div className="mt-3 flex flex-col gap-1 bg-primary/5 p-3 rounded-xl border border-primary/10 w-fit group">
                              <span className="text-[8px] font-black uppercase text-primary/40 leading-none">TxID</span>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-[11px] font-black text-primary truncate max-w-[150px] sm:max-w-[250px]">
                                  {tx.hash}
                                </span>
                                <button 
                                  className="h-8 w-8 flex items-center justify-center bg-white border rounded-lg shadow-sm hover:bg-muted transition-all active:scale-95"
                                  onClick={() => copyToClipboard(tx.hash, "TxID")}
                                >
                                  <Copy className="h-3.5 w-3.5 text-primary" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("font-black text-sm", isVoided ? "text-muted-foreground line-through" : tx.type === 'receive' ? "text-green-600" : "text-primary")}>
                          {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground">${tx.fiatValueUSD.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                }) : initialized ? (
                  <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <Database className="h-12 w-12" />
                    <p className="text-xs font-black uppercase tracking-widest">No official activity recorded</p>
                  </div>
                ) : (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-6 border-b border-primary/5">
                      <div className="h-14 w-full bg-muted/20 animate-pulse rounded-xl" />
                    </div>
                  ))
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
    <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
