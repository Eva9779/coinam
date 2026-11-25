"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
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
  Zap,
  ExternalLink,
  Lock,
  ShieldCheck
} from "lucide-react";
import { useWalletStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CHAINS = {
  BASE: { rpc: "https://mainnet.base.org", explorer: "https://basescan.org/tx/" },
  ETHEREUM: { rpc: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io/tx/" }
};

function TransactionsContent() {
  const { transactions, addTransaction, liveBalances, botConfig, user } = useWalletStore();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'send';
  
  const [isSending, setIsSending] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [lastTx, setLastTx] = useState<{ hash: string, url: string } | null>(null);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");

  const combinedAssets = useMemo(() => {
    return [
      { id: 'ETH_BASE', currency: 'ETH (Base)', amount: liveBalances.baseEth },
      { id: 'ETH_MAINNET', currency: 'ETH (Mainnet)', amount: liveBalances.mainnetEth },
      { id: 'USDC_BASE', currency: 'USDC (Base)', amount: liveBalances.usdcBalance },
    ];
  }, [liveBalances]);

  useEffect(() => {
    if (combinedAssets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(combinedAssets[0].id);
    }
  }, [combinedAssets, selectedAssetId]);

  const activeAsset = combinedAssets.find(a => a.id === selectedAssetId);
  const displayAddress = botConfig?.address || "Initialize Vault First";

  const handlePreSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botConfig) {
      toast({ title: "Vault Required", description: "Initialize your vault in the Strategy Enclave first.", variant: "destructive" });
      return;
    }
    const val = parseFloat(amount);
    if (val > (activeAsset?.amount || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    setShowPinDialog(true);
  };

  const handleFinalSend = async () => {
    if (!user || !activeAsset || !botConfig || !pin) return;
    
    setIsSending(true);
    setLastTx(null);

    try {
      const wallet = await ethers.Wallet.fromEncryptedJson(botConfig.encryptedJson, pin);
      const isBase = selectedAssetId.includes('BASE');
      const network = isBase ? CHAINS.BASE : CHAINS.ETHEREUM;
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const connectedWallet = wallet.connect(provider);

      let tx;
      if (selectedAssetId === 'USDC_BASE') {
        const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
        const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contract = new ethers.Contract(usdcAddress, abi, connectedWallet);
        const amountUnits = ethers.parseUnits(amount, 6);
        tx = await contract.transfer(recipient, amountUnits);
      } else {
        const valueWei = ethers.parseEther(amount);
        tx = await connectedWallet.sendTransaction({ to: recipient, value: valueWei });
      }

      setLastTx({ hash: tx.hash, url: `${network.explorer}${tx.hash}` });
      
      addTransaction({
        type: 'send',
        hash: tx.hash,
        currency: activeAsset.currency,
        amount: parseFloat(amount),
        fiatValueUSD: parseFloat(amount) * (selectedAssetId.includes('USDC') ? 1 : liveBalances.ethPriceUsd),
        fromAddress: displayAddress,
        toAddress: recipient,
        description: `External Broadcast`,
        status: 'completed'
      });

      setAmount("");
      setRecipient("");
      setPin("");
      setShowPinDialog(false);
      toast({ title: "Transfer Successful", description: "Your broadcast is confirmed on the ledger." });
    } catch (err: any) {
      toast({ title: "Auth Failed", description: "Incorrect Vault PIN or Network Delay.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === "Initialize Vault First") return;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} Copied` });
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Database className="h-8 w-8 text-secondary" />
            Capital Routing
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Production-Grade Cross-Chain Execution Active.</p>
        </div>
        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          ENCLAVE SECURE
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
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Authorize production transfer with your Vault PIN</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handlePreSend} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Vault</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger className="h-14 bg-background/50 border-2 rounded-xl font-bold">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      {combinedAssets.map(a => (
                        <SelectItem key={a.id} value={a.id} className="font-bold">
                          {a.currency} ({a.amount.toFixed(4)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Recipient Address</Label>
                  <Input 
                    placeholder="0x..." 
                    value={recipient} 
                    onChange={(e) => setRecipient(e.target.value)} 
                    className="h-14 rounded-xl font-bold bg-background/50 border-2"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Amount</Label>
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
                    <div className="absolute right-4 top-4 font-black text-xs text-muted-foreground">{activeAsset?.currency.split(' ')[0]}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/20">
                  <p className="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" /> Direct Mainnet Execution
                  </p>
                  <p className="text-[10px] text-amber-600 font-medium leading-relaxed mt-1">
                    Transfers confirm in ~15s on Base and ~2m on Ethereum. Ensure enough gas is available.
                  </p>
                </div>

                {lastTx && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase">Broadcast Confirmed</p>
                      <p className="text-[9px] font-mono text-emerald-600 truncate max-w-[200px]">{lastTx.hash}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] uppercase font-black gap-1" asChild>
                      <a href={lastTx.url} target="_blank" rel="noreferrer">
                        View Receipt <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}

                <Button type="submit" className="w-full h-16 text-xl font-black rounded-2xl shadow-xl gap-3 transition-transform hover:scale-[1.01]">
                  <Send className="h-6 w-6" /> Authorize Broadcast
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive">
           <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardContent className="flex flex-col items-center py-16 space-y-8">
              <div className="p-4 bg-white rounded-3xl shadow-xl border-2 border-primary/5">
                <QRCodeSVG value={displayAddress} size={220} />
              </div>
              <div className="w-full max-w-sm space-y-4 text-center">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Secure Deposit Endpoint</Label>
                <div className="flex flex-col gap-2">
                  <Input 
                    readOnly 
                    value={displayAddress} 
                    className="h-14 font-mono text-[13px] font-black rounded-xl border-2 bg-background/50 text-center" 
                  />
                  <Button variant="outline" className="h-12 rounded-xl border-2 font-black gap-2" onClick={() => copyToClipboard(displayAddress, "Address")}>
                    <Copy className="h-4 w-4" /> Copy Address
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium px-4 leading-relaxed">
                  Only send supported tokens (ETH, USDC) to this address on Base or Ethereum Mainnet.
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
                 Ledger History
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {transactions.length > 0 ? transactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex justify-between items-start hover:bg-primary/[0.02] transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center border-2 mt-1",
                        tx.type === 'receive' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      )}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-sm">{tx.description}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
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
                    <p className="text-xs font-black uppercase tracking-widest">No activity recorded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Lock className="h-6 w-6 text-secondary" />
              Sign Broadcast
            </DialogTitle>
            <DialogDescription>
              Enter your Vault PIN to decrypt your key and sign this production transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vault PIN</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-14 text-2xl tracking-widest text-center font-black rounded-xl border-2"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-black rounded-xl text-lg shadow-xl" onClick={handleFinalSend} disabled={isSending || !pin}>
              {isSending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
              Authorize & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
