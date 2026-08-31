
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
  AlertCircle
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
      toast({ title: "Invalid Amount", description: "Please check your balance and enter a valid amount.", variant: "destructive" });
      return;
    }

    if (!bankName || !accountNumber) {
      toast({ title: "Details Required", description: "Please provide your bank information.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    // Simulate Institutional RTGS/SWIFT Processing
    setTimeout(() => {
      const fiatPrice = 1; // Assuming USDC/USD parity for withdrawal
      updateBalance(asset.currency, -val, fiatPrice);
      
      addTransaction({
        type: 'send',
        currency: asset.currency,
        amount: val,
        fiatValueUSD: val,
        description: `Bank Payout: ${bankName} (Acct: ${accountNumber.slice(-4)})`
      });

      setIsProcessing(false);
      setWithdrawStep('success');
      toast({
        title: "Payout Intent Authorized",
        description: "Your settlement is now being processed via the RTGS network.",
      });
    }, 2000);
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
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Ledger...</p>
      </div>
    );
  }

  const asset = assets.find(a => a.id === selectedAssetId);
  const canWithdraw = !!asset && asset.amount > 0;

  if (withdrawStep === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-2xl shadow-green-500/5">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-primary tracking-tighter">Settlement Initialized</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Your funds have been deducted from the enclave and sent to the **{bankName}** settlement queue. 
            Estimated arrival: **30-60 minutes** (Jamaica RTGS Window).
          </p>
        </div>
        <div className="p-6 bg-muted/30 rounded-3xl border text-left max-w-md mx-auto space-y-3 font-mono text-[10px] uppercase">
          <div className="flex justify-between"><span className="opacity-50">Reference ID:</span> <span>SET-{Date.now().toString().slice(-8)}</span></div>
          <div className="flex justify-between"><span className="opacity-50">Settlement Type:</span> <span>RTGS (Domestic)</span></div>
          <div className="flex justify-between"><span className="opacity-50">Amount:</span> <span className="text-primary font-black">${parseFloat(amount).toFixed(2)} USD</span></div>
        </div>
        <Button variant="outline" className="h-12 px-8 rounded-xl font-bold" onClick={() => {
          setWithdrawStep('entry');
          setAmount("");
        }}>
          Initiate Another Settlement
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
          <Link href="/wallet">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Banknote className="h-8 w-8 text-secondary" />
            Institutional Off-Ramp
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Liquidate assets and stock earnings to your bank via global gateways.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {totalBotEarnings > 0 && (
            <Card className="rounded-[2rem] border-2 border-dashed border-secondary/30 bg-secondary/5 overflow-hidden shadow-xl shadow-secondary/5">
              <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20 shrink-0">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Strategy Earnings (Yield)</p>
                    <p className="text-3xl font-black text-primary">${totalBotEarnings.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">Must be liquidated to USDC before bank withdrawal.</p>
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
                  <CardTitle className="text-2xl font-black tracking-tight">Withdrawal Hub</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Multi-Protocol Liquidity Hub</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 font-bold">READY</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Wallet Endpoint</Label>
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
                              <span className="font-bold text-sm">{a.currency} Wallet</span>
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

              <Tabs defaultValue="direct" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="direct" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Landmark className="h-4 w-4" />
                    Direct (JM)
                  </TabsTrigger>
                  <TabsTrigger value="p2p" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Shuffle className="h-4 w-4" />
                    P2P
                  </TabsTrigger>
                  <TabsTrigger value="external" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Smartphone className="h-4 w-4" />
                    Bridges
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="direct" className="space-y-6 mt-6">
                  <form onSubmit={handleBankWithdrawal} className="space-y-6">
                    <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Jamaican Bank Name</Label>
                          <Select value={bankName} onValueChange={setBankName}>
                            <SelectTrigger className="h-12 rounded-xl font-bold">
                              <SelectValue placeholder="Select Local Bank" />
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
                            className="h-12 rounded-xl font-bold"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Account Number</Label>
                          <Input 
                            placeholder="Bank Account Number" 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Branch Code / SWIFT</Label>
                          <Input 
                            placeholder="Optional for domestic" 
                            className="h-12 rounded-xl font-mono text-sm"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 flex items-start gap-3">
                         <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                         <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                           Settlement will be processed via the **Institutional RTGS Bridge**. Funds are typically credited to your Jamaican bank account within **60 minutes** during business hours.
                         </p>
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all" 
                        disabled={!canWithdraw || isProcessing}
                      >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Banknote className="h-6 w-6" />}
                        Execute Bank Settlement
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="p2p" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20 shadow-xl shadow-primary/5 transform rotate-3">
                      <Shuffle className="h-10 w-10 text-primary" />
                    </div>
                    
                    <div className="space-y-2 max-max-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Institutional P2P</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Liquidate assets via verified institutional peer networks. Ideal for high-volume transactions with zero bank intervention.
                      </p>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl bg-primary text-primary-foreground" 
                      asChild
                    >
                      <a href={`https://p2p.binance.com/en/sell/USDC?fiat=USD`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-6 w-6" />
                        Launch P2P Enclave
                      </a>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="external" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform -rotate-3">
                      <Globe className="h-10 w-10 text-secondary" />
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">External Liquidity Bridge</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Access third-party liquidity providers like **Stripe** and **Onramper** for international settlements.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-14 rounded-xl font-bold" asChild>
                        <a href="https://buy.stripe.com/crypto-offramp" target="_blank" rel="noopener noreferrer">Stripe Rail</a>
                      </Button>
                      <Button variant="outline" className="h-14 rounded-xl font-bold" asChild>
                        <a href="https://sell.onramper.com/" target="_blank" rel="noopener noreferrer">Onramper Bridge</a>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {!canWithdraw && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-2 text-destructive font-black text-[10px] uppercase animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient Funds for Bank Settlement
                  </div>
                  <Button variant="outline" asChild className="rounded-xl font-bold h-10 px-6 border-2">
                    <Link href="/trade">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Swap Assets to USDC
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
              RTGS Protocol
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Daily Payout Limit</span>
                <span className="font-black">$25,000.00</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Settlement Speed</span>
                <span className="font-black text-secondary">30-60 MINS (RTGS)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 pb-3">
                <span>Network Region</span>
                <Badge variant="secondary" className="text-[8px] font-black uppercase bg-white/20">JAMAICA (JM)</Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] p-6 border-2 border-dashed border-primary/10 bg-muted/20">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
              <Globe className="h-4 w-4 text-secondary" />
              Caribbean Sync
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
              The **Direct (JM)** protocol is the primary withdrawal path for Jamaican residents. It ensures your assets are converted to fiat and settled directly into your local commercial bank account.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
