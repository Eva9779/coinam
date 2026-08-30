
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Banknote, Building2, ShieldCheck, Loader2, ArrowLeft, Zap, ExternalLink, CreditCard, Sparkles, TrendingUp } from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createWithdrawalSession } from '@/app/lib/stripe-actions';

export default function WithdrawPage() {
  const { assets, initialized, totalBotEarnings, liquidateEarnings } = useWalletStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const handleWithdrawClick = async () => {
    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) return;

    setIsRedirecting(true);
    toast({
      title: "Bank Bridge Initialized",
      description: "Redirecting to secure Stripe/Institutional gateway...",
    });

    try {
      const { clientSecret } = await createWithdrawalSession(asset.address, asset.amount, asset.currency);
      
      if (clientSecret) {
        window.open(`https://buy.stripe.com/crypto-onramp?client_secret=${clientSecret}`, '_blank');
      } else {
        const offrampUrl = `https://crypto.link.com/sell?wallet=${asset.address}&asset=${selectedAsset.toLowerCase()}`;
        window.open(offrampUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      window.open(`https://crypto.link.com/sell?wallet=${asset.address}&asset=${selectedAsset.toLowerCase()}`, '_blank');
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

  const asset = assets.find(a => a.currency === selectedAsset);
  const canWithdraw = !!asset && asset.amount > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
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
                  <CardTitle className="text-2xl font-black tracking-tight">Withdrawal Settings</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Stripe & Global Bank Bridge</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 font-bold">ACTIVE</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Wallet Endpoint</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="h-16 text-lg font-bold bg-background/50 border-2 rounded-2xl transition-all hover:border-primary/50">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl p-2 shadow-2xl">
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.currency} className="rounded-xl h-14 mb-1">
                        <div className="flex items-center justify-between w-full min-w-[300px]">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-xs font-black border">{a.currency}</div>
                            <span className="font-bold">{a.currency} Wallet</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground font-bold">Bal: {a.amount.toFixed(4)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-6 bg-secondary/5 rounded-[1.5rem] border-2 border-dashed border-secondary/20 flex gap-4 items-start relative overflow-hidden">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-secondary" />
                </div>
                <div className="text-xs leading-relaxed relative z-10">
                  <span className="font-black text-secondary block mb-1 text-sm uppercase tracking-tighter">Settlement Protocol</span>
                  International withdrawals are processed via **Stripe Global** or **Institutional P2P** bridges for users in restricted regions (Jamaica).
                </div>
              </div>

              <Button 
                className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] gap-3" 
                onClick={handleWithdrawClick}
                disabled={!canWithdraw || isRedirecting}
              >
                {isRedirecting ? <Loader2 className="h-8 w-8 animate-spin" /> : <ExternalLink className="h-8 w-8" />}
                {isRedirecting ? "Initializing Gateway..." : "Authorize Bank Payout"}
              </Button>

              {!canWithdraw && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <p className="text-center text-[10px] text-destructive font-bold uppercase tracking-widest">
                    Insufficient liquid balance for bank settlement.
                  </p>
                  <Button variant="outline" asChild className="rounded-xl font-bold h-10 px-6 border-2">
                    <Link href="/trade">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Swap Stocks to USDC
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
              Off-Ramp Limits
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Daily Institutional Limit</span>
                <span className="font-black">$50,000.00</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Settlement Velocity</span>
                <span className="font-black text-secondary">INSTANT (T+0)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 pb-3">
                <span>Verification Enclave</span>
                <Badge variant="secondary" className="text-[8px] font-black uppercase bg-white/20">LEVEL 2 APPROVED</Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] p-6 border-2 border-dashed border-primary/10 bg-muted/20">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
              <CreditCard className="h-4 w-4 text-secondary" />
              Gateway Sync
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
              Direct bank payouts are handled securely by **Stripe Connect** or **Institutional Bridge**. Funds usually settle in your local bank in under 30 minutes via RTGS or Global SWIFT.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
