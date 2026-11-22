'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Banknote, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  CreditCard, 
  Sparkles, 
  TrendingUp,
  Globe,
  Smartphone,
  AlertCircle,
  CreditCard as CardIcon,
  Repeat,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import Link from 'next/link';

export default function WithdrawPage() {
  const { assets, initialized, totalBotEarnings, liquidateEarnings } = useWalletStore();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isLiquidating, setIsLiquidating] = useState(false);

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAssetId) {
      const usdc = assets.find(a => a.currency === 'USDC' && a.isPrimary);
      setSelectedAssetId(usdc?.id || assets[0].id);
    }
  }, [initialized, assets, selectedAssetId]);

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
              Institutional Payout Hub
            </h2>
            <p className="text-muted-foreground text-sm font-medium">Real-time bridges for converting digital assets to Bank or Card.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-4 py-2 font-bold uppercase text-[10px] tracking-widest">
              MAINNET SETTLEMENT ACTIVE
           </Badge>
        </div>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Harvested Strategy Yield</p>
                    <p className="text-4xl font-black text-primary">${totalBotEarnings.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">Authorize liquidation to settle yield into your USDC Vault.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleLiquidate} 
                  disabled={isLiquidating}
                  className="h-14 px-8 rounded-2xl font-black shadow-xl gap-2 w-full sm:w-auto bg-secondary text-secondary-foreground"
                >
                  {isLiquidating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  Liquidate Real-Time
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="border-b bg-muted/20 pb-8 px-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">Execute Real-World Settlement</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Direct Bank or Card payout via production rails</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 font-bold animate-pulse uppercase text-[8px]">Live Gateway</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Payout Asset</Label>
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

              <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform rotate-3">
                  <CardIcon className="h-10 w-10 text-secondary" />
                </div>
                
                <div className="space-y-2 max-w-sm mx-auto">
                  <h4 className="text-2xl font-black text-primary tracking-tight uppercase">Real-Time Payout Rails</h4>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Convert your earnings to **JMD** or **USD** directly to your **Visa/Mastercard** or bank account. These bridges operate in real-time for Jamaica.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Methods</span>
                    <p className="text-xs font-bold">Visa / MC / Bank</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Transfer Time</span>
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Real-Time
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Button 
                    className="h-16 rounded-2xl font-black text-xs gap-2 shadow-xl bg-secondary text-secondary-foreground" 
                    asChild
                  >
                    <a href={moonpayUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      MoonPay
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

              {!canWithdraw && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-2 text-destructive font-black text-[10px] uppercase animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    Insufficient settled funds for payout
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Harvested yield must be settled to USDC before withdrawal.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground rounded-[2rem] p-8 shadow-xl border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <ShieldCheck className="h-48 w-48" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              Security Status
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Daily Payout Cap</span>
                <span className="font-black">$25,000.00</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 border-b border-white/10 pb-3">
                <span>Settlement Rail</span>
                <Badge variant="secondary" className="text-[8px] font-black uppercase bg-white/20">MAINNET (REAL-TIME)</Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-70 pb-3">
                <span>Account Region</span>
                <span className="text-secondary font-black">JAMAICA (JM)</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] p-6 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent opacity-10 transition-opacity" />
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-secondary relative z-10">
              <Globe className="h-4 w-4" />
              Real-Time Banking
            </h3>
            <p className="text-[10px] text-white/60 leading-relaxed font-medium relative z-10">
              Once you liquidate your strategy yield to your primary USDC vault, you can bridge it to your card via **MoonPay** or local bank via **Binance P2P**. Settlement is finalized on Mainnet for immutable audit trails.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
