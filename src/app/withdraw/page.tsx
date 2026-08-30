
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Smartphone
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createWithdrawalSession } from '@/app/lib/stripe-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WithdrawPage() {
  const { assets, initialized, totalBotEarnings, liquidateEarnings } = useWalletStore();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [initialized, assets, selectedAssetId]);

  const handleWithdrawClick = async (provider: 'stripe' | 'bridge' | 'p2p') => {
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset || !asset.address) return;

    setIsRedirecting(true);
    
    const message = provider === 'stripe' ? "Stripe Rail" : provider === 'bridge' ? "Global Bank Bridge" : "P2P Protocol";
    
    toast({
      title: `${message} Initialized`,
      description: `Connecting to secure ${provider === 'bridge' ? 'Jamaican RTGS' : 'institutional'} gateway...`,
    });

    try {
      if (provider === 'stripe') {
        const { clientSecret } = await createWithdrawalSession(asset.address, asset.amount, asset.currency);
        if (clientSecret) {
          window.open(`https://buy.stripe.com/crypto-onramp?client_secret=${clientSecret}`, '_blank');
        } else {
          window.open(`https://crypto.link.com/sell?wallet=${asset.address}&asset=${asset.currency.toLowerCase()}`, '_blank');
        }
      } else if (provider === 'bridge') {
        // High-success bridge for Jamaica (e.g. Onramper Off-ramp or specialized Caribbean bridge)
        const bridgeUrl = `https://sell.onramper.com/?themeName=dark&containerColor=020617&primaryColor=3f51b5&walletAddress=${asset.address}&defaultCrypto=${asset.currency.toLowerCase()}&fiatCurrency=USD`;
        window.open(bridgeUrl, '_blank', 'noopener,noreferrer');
      } else {
        // P2P Institutional Settlement
        const p2pUrl = `https://p2p.binance.com/en/sell/USDC?fiat=USD&payment=ALL`;
        window.open(p2pUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      toast({ title: "Gateway Connection Error", variant: "destructive" });
    } finally {
      setIsRedirecting(false);
    }
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
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Ledger...</p>
      </div>
    );
  }

  const asset = assets.find(a => a.id === selectedAssetId);
  const canWithdraw = !!asset && asset.amount > 0;

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
                  <CardTitle className="text-2xl font-black tracking-tight">Withdrawal Rail</CardTitle>
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

              <Tabs defaultValue="bridge" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="bridge" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Globe className="h-4 w-4" />
                    Bank Bridge
                  </TabsTrigger>
                  <TabsTrigger value="p2p" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Shuffle className="h-4 w-4" />
                    P2P
                  </TabsTrigger>
                  <TabsTrigger value="stripe" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Smartphone className="h-4 w-4" />
                    Stripe
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bridge" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform -rotate-3">
                      <Globe className="h-10 w-10 text-secondary" />
                    </div>
                    
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Global Bank Bridge</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Optimized for **Jamaica**. Supports direct payouts to **NCB, Sagicor, and Scotiabank** via RTGS and SWIFT protocols.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol</span>
                        <p className="text-xs font-bold">RTGS / SWIFT</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Region</span>
                        <p className="text-xs font-bold">Jamaica (High Success)</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-secondary text-secondary-foreground" 
                      onClick={() => handleWithdrawClick('bridge')}
                      disabled={!canWithdraw || isRedirecting}
                    >
                      {isRedirecting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ExternalLink className="h-6 w-6" />}
                      Authorize Bridge Payout
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="p2p" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border-2 border-primary/20 shadow-xl shadow-primary/5 transform rotate-3">
                      <Shuffle className="h-10 w-10 text-primary" />
                    </div>
                    
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Institutional P2P</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Liquidate assets via verified institutional peer networks. Ideal for high-volume transactions with zero bank intervention.
                      </p>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground" 
                      onClick={() => handleWithdrawClick('p2p')}
                      disabled={!canWithdraw || isRedirecting}
                    >
                      {isRedirecting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ExternalLink className="h-6 w-6" />}
                      Launch P2P Enclave
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-slate-900/10 flex items-center justify-center mx-auto border-2 border-slate-900/20 shadow-xl shadow-slate-900/5">
                      <Smartphone className="h-10 w-10 text-slate-900" />
                    </div>
                    
                    <div className="space-y-2 max-w-sm mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Stripe Connect</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Standard rail for US/EU verified users. May have restricted success in the Caribbean region.
                      </p>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-slate-900 text-white" 
                      onClick={() => handleWithdrawClick('stripe')}
                      disabled={!canWithdraw || isRedirecting}
                    >
                      {isRedirecting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ExternalLink className="h-6 w-6" />}
                      Authorize Stripe Rail
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {!canWithdraw && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-center text-[10px] text-destructive font-bold uppercase tracking-widest">
                    Insufficient liquid balance for bank settlement.
                  </p>
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
              Regional Limits
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Daily Payout Limit</span>
                <span className="font-black">$25,000.00</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Settlement Speed</span>
                <span className="font-black text-secondary">30-60 MINS (JM)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 pb-3">
                <span>Verification Enclave</span>
                <Badge variant="secondary" className="text-[8px] font-black uppercase bg-white/20">GLOBAL READY</Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] p-6 border-2 border-dashed border-primary/10 bg-muted/20">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
              <Globe className="h-4 w-4 text-secondary" />
              Caribbean Sync
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
              The **Global Bank Bridge** is the recommended path for users in **Jamaica**. It ensures high success rates for local transfers and native Caribbean debit card settlements.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
