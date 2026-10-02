
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
  Activity
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (!asset || val > asset.amount) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    if (!asset.privateKey) {
      toast({ title: "No Private Key found for signing", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const txHash = await sendLiveTransaction(asset.privateKey as `0x${string}`, recipient, amount);
      
      addTransaction({
        type: 'send',
        hash: txHash,
        currency: currency,
        amount: val,
        fiatValueUSD: val * (asset.fiatValueUSD / Math.max(asset.amount, 1)),
        fromAddress: asset.address,
        toAddress: recipient,
        description: `External Wallet Transfer`
      });

      setAmount("");
      setRecipient("");
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
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Database className="h-8 w-8 text-secondary" />
            Send & Receive
          </h2>
          <p className="text-muted-foreground text-sm">Mainnet settlement protocol active.</p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/30 p-1">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="receive">Receive</TabsTrigger>
          <TabsTrigger value="history">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Initiate Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <Label>Source Asset</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger className="h-12 bg-background/50">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.currency} ({a.amount.toFixed(4)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recipient Address</Label>
                  <Input placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="any" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={isSending}>
                  {isSending ? <Loader2 className="animate-spin" /> : "Authorize & Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
           <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardContent className="flex flex-col items-center py-10 space-y-6">
              <QRCodeSVG value={asset?.address || ""} size={200} />
              <div className="w-full max-w-sm space-y-2">
                <Label>Your Receiving Address</Label>
                <div className="flex gap-2">
                  <Input readOnly value={asset?.address || ""} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => {
                    navigator.clipboard.writeText(asset?.address || "");
                    toast({ title: "Copied" });
                  }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex justify-between items-center">
                    <div>
                      <div className="font-bold">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">{tx.currency} • {new Date(tx.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-bold", tx.type === 'receive' ? "text-green-600" : "text-primary")}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">${tx.fiatValueUSD.toFixed(2)}</div>
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
