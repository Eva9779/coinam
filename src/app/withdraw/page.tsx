'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Banknote, Building2, ShieldCheck, Loader2, ArrowLeft, Zap, ExternalLink, CreditCard } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function WithdrawPage() {
  const { assets, initialized } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const getOfframpUrl = () => {
    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) return '#';
    // Link to a high-availability off-ramp provider (Stripe/Coinbase style)
    return `https://crypto.link.com/sell?wallet=${asset.address}&destination=bank&asset=${selectedAsset.toLowerCase()}`;
  };

  const handleWithdrawClick = () => {
    toast({
      title: "Bank Bridge Initialized",
      description: "Redirecting to secure fiat off-ramp gateway...",
    });
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/wallet">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Banknote className="h-8 w-8 text-secondary" />
            Fiat Off-Ramp
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Liquidate assets directly to your US Bank Account or Debit Card.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
          <CardHeader className="border-b bg-muted/20 pb-8">
            <CardTitle className="text-2xl font-bold tracking-tight">Withdrawal Settings</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Direct Bank Bridge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Source Asset to Liquidate</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="h-16 text-lg font-bold bg-background/50 border-2 rounded-2xl">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.currency}>
                      <div className="flex items-center justify-between w-full min-w-[300px] py-1">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-xs font-black">{a.currency}</div>
                          <span className="font-bold">{a.currency}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">Bal: {a.amount.toFixed(4)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-6 bg-secondary/5 rounded-2xl border-2 border-dashed border-secondary/20 flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-sm leading-relaxed">
                <span className="font-bold text-secondary block mb-1 text-base">KYC Requirement</span>
                To comply with US Financial Regulations, bank withdrawals require a one-time identity verification (KYC) via the secure gateway.
              </div>
            </div>

            {canWithdraw ? (
              <Button 
                className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] gap-3" 
                asChild
              >
                <a 
                  href={getOfframpUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleWithdrawClick}
                >
                  <ExternalLink className="h-8 w-8" />
                  Initialize Bank Withdrawal
                </a>
              </Button>
            ) : (
              <Button 
                className="w-full h-20 text-2xl font-black rounded-2xl opacity-50 cursor-not-allowed gap-3" 
                disabled
              >
                <ExternalLink className="h-8 w-8" />
                Insufficient Balance
              </Button>
            )}

            {!canWithdraw && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-[10px] text-destructive font-bold uppercase tracking-widest">
                  Insufficient balance in selected vault for liquidation.
                </p>
                <Button variant="outline" asChild className="rounded-xl font-bold">
                  <Link href="/buy">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Fund Wallet First
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-xl border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Building2 className="h-32 w-32" />
            </div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Banking Limits
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-xs opacity-80 border-b border-white/10 pb-2">
                <span>Daily Limit</span>
                <span className="font-bold">$50,000.00</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-80 border-b border-white/10 pb-2">
                <span>Settlement Time</span>
                <span className="font-bold">Instant (T+0)</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-80 pb-2">
                <span>Verification Level</span>
                <Badge variant="secondary" className="text-[9px] font-black uppercase">Level 2 Required</Badge>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl p-6 border-dashed border-2 bg-muted/20">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Card Payouts
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Visa Direct and Mastercard Send are supported for eligible US Debit cards. Funds usually arrive in under 30 minutes.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
