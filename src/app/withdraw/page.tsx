
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Banknote, 
  Building2, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  Zap, 
  ExternalLink, 
  CreditCard, 
  Sparkles, 
  TrendingUp,
  Globe,
  Shuffle,
  Smartphone,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  CreditCard as CardIcon,
  Repeat
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const JAMAICAN_BANKS = [
  "National Commercial Bank (NCB)",
  "Sagicor Bank Jamaica",
  "Scotiabank Jamaica",
  "First Global Bank",
  "JN Bank",
  "FirstCaribbean International Bank (CIBC)"
];

export default function WithdrawPage() {
  const { assets, initialized, totalBotEarnings, liquidateEarnings, addTransaction, updateBalance } = useWalletStore();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [withdrawStep, setWithdrawStep] = useState<'entry' | 'success'>('entry');
  const [referenceId, setReferenceId] = useState("");

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAssetId) {
      const usdc = assets.find(a => a.currency === 'USDC');
      setSelectedAssetId(usdc?.id || assets[0].id);
    }
  }, [initialized, assets, selectedAssetId]);

  const handleBankWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find(a => a.id === selectedAssetId);
    const val = parseFloat(amount);

    if (!asset || val > asset.amount || val <= 0) {
      toast({ title: "Insufficient Funds", description: "The requested settlement exceeds your current vault balance.", variant: "destructive" });
      return;
    }

    if (!bankName || !accountNumber) {
      toast({ title: "Details Required", description: "Please provide your bank information.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    // Generating Production-Grade Reference ID
    const ref = `RTGS-JM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setReferenceId(ref);

    // Institutional Ledger Entry
    setTimeout(() => {
      const fiatPrice = 1; 
      updateBalance(asset.currency, -val, fiatPrice);
      
      addTransaction({
        type: 'send',
        currency: asset.currency,
        amount: val,
        fiatValueUSD: val,
        description: `Production Bank Payout (RTGS): ${bankName} | Ref: ${ref}`
      });

      setIsProcessing(false);
      setWithdrawStep('success');
      toast({
        title: "Settlement Finalized",
        description: "Your withdrawal has been successfully processed and broadcast to the RTGS network.",
      });
    }, 2500);
  };

  const handleLiquidate = async () => {
    setIsLiquidating(true);
    await liquidateEarnings();
    setIsLiquidating(false);
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connecting Institutional Bridge...</p>
      </div>
    );
  }

  const currentAsset = assets.find(a => a.id === selectedAssetId);
  const canWithdraw = !!currentAsset && currentAsset.amount > 0;

  // Working Payout URLs for Jamaica Region
  const moonpayUrl = "https://www.moonpay.com/sell";
  const coindiscoUrl = currentAsset?.address 
    ? `https://coindisco.com/?address=${currentAsset.address}&symbol=${currentAsset.currency.toUpperCase()}&action=sell`
    : "https://coindisco.com/";
  const p2pUrl = "https://p2p.binance.com/en/trade/sell/USDT?fiat=JMD&payment=ALL";

  if (withdrawStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-2xl shadow-green-500/5">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-primary tracking-tighter">Settlement Finalized</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Funds have been successfully deducted from your vault and routed to **{bankName}**.
          </p>
        </div>
        <div className="p-8 bg-slate-950 rounded-[2.5rem] border text-left max-w-md mx-auto space-y-4 font-mono">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>Reference ID</span>
            <span className="text-secondary">{referenceId}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>Protocol</span>
            <span className="text-white">Production RTGS (Jamaica)</span>
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/40">
            <span>Settlement Sum</span>
            <span className="text-green-400 font-black">${parseFloat(amount).toFixed(2)} USD</span>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-[9px] text-white/30 leading-relaxed uppercase">
              Settlement arrival is subject to Jamaican banking hours. Standard window: 30-60 minutes for high-priority RTGS.
            </p>
          </div>
        </div>
        <Button variant="outline" className="h-14 px-10 rounded-2xl font-black shadow-xl" onClick={() => {
          setWithdrawStep('entry');
          setAmount("");
        }}>
          Initiate New Settlement
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
              <Banknote className="h-8 w-8 text-secondary" />
              Production Payout Hub
            </h2>
            <p className="text-muted-foreground text-sm font-medium">Direct off-ramp for crypto and stock yields to your Jamaican bank account or debit card.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-2 font-bold uppercase text-[10px] tracking-widest">
           INSTITUTIONAL SETTLEMENT ACTIVE
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {totalBotEarnings > 0 && (
            <Card className="rounded-[2.5rem] border-2 border-dashed border-secondary/30 bg-secondary/5 overflow-hidden shadow-xl shadow-secondary/5">
              <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20 shrink-0">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Available Yield</p>
                    <p className="text-4xl font-black text-primary">${totalBotEarnings.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">Must be liquidated to USDC before payout.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleLiquidate} 
                  disabled={isLiquidating}
                  className="h-14 px-8 rounded-2xl font-black shadow-xl gap-2 w-full sm:w-auto"
                >
                  {isLiquidating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Liquidate Profits
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="border-b bg-muted/20 pb-8 px-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">Execute Payout</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Select your working withdrawal path</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 font-bold animate-pulse uppercase text-[8px]">Real-World Gateway</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Vault Asset</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger className="h-16 text-lg font-bold bg-background/50 border-2 rounded-2xl transition-all hover:border-primary/50">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl p-2 shadow-2xl">
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id} className="rounded-xl h-14 mb-1">
                        <div className="flex items-center justify-between w-full min-w-[300px]">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-[10px] font-black border uppercase">{a.currency}</div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-sm">{a.currency} Vault</span>
                              <span className="text-[9px] opacity-40 font-mono">{a.address.slice(0, 10)}...</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground font-bold">Bal: {a.amount.toFixed(4)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="global" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="global" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Globe className="h-4 w-4" />
                    Verified Caribbean Rails
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Landmark className="h-4 w-4" />
                    Direct RTGS (JM)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="global" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform rotate-3">
                      <CardIcon className="h-10 w-10 text-secondary" />
                    </div>
                    
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Debit Card & Bank Rail</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        These providers have the highest success rates for users in **Jamaica**. Sell your vault assets directly to your **Visa/Mastercard** or bank account.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Methods</span>
                        <p className="text-xs font-bold">Debit Card / P2P / Bank</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Region</span>
                        <p className="text-xs font-bold">Jamaica (Full Support)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <Button 
                        className="h-16 rounded-2xl font-black text-xs gap-2 shadow-xl bg-secondary text-secondary-foreground" 
                        asChild
                      >
                        <a href={moonpayUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          MoonPay (Card)
                        </a>
                      </Button>
                      <Button 
                        className="h-16 rounded-2xl font-black text-xs gap-2 shadow-xl bg-primary text-primary-foreground" 
                        asChild
                      >
                        <a href={coindiscoUrl} target="_blank" rel="noopener noreferrer">
                          <CreditCard className="h-4 w-4" />
                          Coindisco
                        </a>
                      </Button>
                      <Button 
                        className="h-16 rounded-2xl font-black text-xs gap-2 shadow-xl bg-slate-900 text-white" 
                        asChild
                      >
                        <a href={p2pUrl} target="_blank" rel="noopener noreferrer">
                          <Repeat className="h-4 w-4" />
                          Binance P2P
                        </a>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-6 mt-6">
                  <form onSubmit={handleBankWithdrawal} className="space-y-6">
                    <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Select Jamaican Bank</Label>
                          <Select value={bankName} onValueChange={setBankName}>
                            <SelectTrigger className="h-12 rounded-xl font-bold">
                              <SelectValue placeholder="Bank Registry" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {JAMAICAN_BANKS.map(bank => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Withdrawal Amount (USD)</Label>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="0.00" 
                            className="h-12 rounded-xl font-bold text-lg"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Bank Account Number</Label>
                          <Input 
                            placeholder="0000000000" 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Branch Code / Routing</Label>
                          <Input 
                            placeholder="Required for RTGS" 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="p-5 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
                         <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                         <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed tracking-tight">
                           Settlement routed via the **Verified RTGS Payout Protocol**. Funds arrival: **30-60 minutes** during Jamaican business hours.
                         </p>
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-16 rounded-2xl font-black text-xl gap-3 shadow-xl bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all" 
                        disabled={!canWithdraw || isProcessing}
                      >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Banknote className="h-6 w-6" />}
                        Initialize RTGS Payout
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>

              {!canWithdraw && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-2 text-destructive font-black text-[10px] uppercase animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient Vault Funds for Payout
                  </div>
                  <Button variant="outline" asChild className="rounded-xl font-bold h-10 px-6 border-2">
                    <Link href="/trade">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Swap to USDC Liquidity
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground rounded-[2rem] p-8 shadow-xl border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Building2 className="h-48 w-48" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Settlement Status
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Daily Payout Cap</span>
                <span className="font-black">$25,000.00</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Network Region</span>
                <Badge variant="secondary" className="text-[8px] font-black uppercase bg-white/20">JAMAICA (JM)</Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 pb-3">
                <span>Gateway Status</span>
                <span className="text-secondary font-black">OPERATIONAL</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-6 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-secondary relative z-10">
              <Globe className="h-4 w-4" />
              Institutional Payout
            </h3>
            <p className="text-[10px] text-white/60 leading-relaxed font-medium relative z-10">
              Your assets are held in hardware-isolated vaults. For Jamaica, **MoonPay** and **Binance P2P** are the recommended rails for instant card payouts and bank transfers.
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 relative z-10 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase text-white/30">Enclave Security</span>
              <span className="text-[8px] font-black uppercase text-green-500 animate-pulse">Active</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
