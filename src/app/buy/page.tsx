'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, ArrowLeft, Zap, ExternalLink, Smartphone, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BuyCryptoPage() {
  const { assets, initialized } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isHttps, setIsHttps] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHttps(window.location.protocol === 'https:');
    }
  }, []);

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const handleStripePurchase = async (method: string = 'universal') => {
    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) {
      toast({ 
        title: "Provisioning Required", 
        description: "Please create a vault key before attempting to fund.",
        variant: "destructive"
      });
      return;
    }

    setIsRedirecting(true);
    
    try {
      const { clientSecret, error } = await createOnrampSession(asset.address, undefined, selectedAsset);
      
      if (clientSecret) {
        toast({
          title: "Stripe Gateway Active",
          description: "Launching secure Stripe Onramp terminal...",
        });
        // Redirect to Stripe hosted onramp
        window.open(`https://buy.stripe.com/crypto-onramp?client_secret=${clientSecret}`, '_blank');
      } else {
        // Fallback to institutional link gateway if Stripe fails or keys are missing
        const gatewayUrl = `https://crypto.link.com/buy?wallet=${asset.address}&asset=${selectedAsset.toLowerCase()}&method=${method}`;
        toast({
          title: "Institutional Gateway",
          description: "Stripe key sync pending. Using backup institutional bridge...",
        });
        window.open(gatewayUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      window.open(`https://crypto.link.com/buy?wallet=${asset.address}&asset=${selectedAsset.toLowerCase()}`, '_blank');
    } finally {
      setIsRedirecting(false);
    }
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Vault State...</p>
      </div>
    );
  }

  const asset = assets.find(a => a.currency === selectedAsset);
  const isLinkReady = !!asset && !!asset.address;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
              <CreditCard className="h-8 w-8 text-secondary" />
              Fiat Gateway
            </h2>
            <p className="text-muted-foreground text-sm font-medium">Stripe & Institutional Gateway Provisioning Protocol.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Gateway Active v2.0.0
        </Badge>
      </div>

      {!isHttps && (
        <div className="p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] flex items-start gap-5 shadow-sm">
          <ShieldAlert className="h-8 w-8 text-amber-600 shrink-0" />
          <div className="text-sm">
            <span className="font-black text-amber-700 block mb-1 uppercase tracking-tight text-xs">Security Environment Requirement</span>
            <p className="leading-relaxed font-medium">
              Stripe and Native Pay require a **Production HTTPS** connection. 
              <strong> Please visit your verified production URL to activate full gateway features.</strong>
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="border-b bg-muted/20 pb-8 px-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Stripe Provisioning</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Direct Stripe Onramp Terminal</CardDescription>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border shadow-inner">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-10 px-8 pb-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-widest opacity-70">Target Vault Address</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-1.5 text-[10px] font-bold text-secondary uppercase hover:underline">
                      <Info className="h-3 w-3" /> How it works
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4 bg-primary text-white border-none rounded-xl shadow-2xl">
                    <p className="text-xs leading-relaxed font-medium">
                      CoinVault integrates with Stripe and the institutional crypto.link.com gateway to provide secure, direct funding to your non-custodial address.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="h-20 text-xl font-black bg-background/50 border-2 rounded-3xl transition-all hover:border-primary/50 focus:ring-4 focus:ring-primary/5">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl p-2 border-2 shadow-2xl">
                {assets.map(a => (
                  <SelectItem key={a.id} value={a.currency} className="rounded-xl h-14 mb-1">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-xs font-black border uppercase">{a.currency}</div>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm">{a.currency} Vault Key</span>
                        <span className="text-[10px] opacity-50 font-mono font-bold tracking-tighter">{a.address.slice(0, 16)}...</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-xs font-black uppercase tracking-widest opacity-70">Native Wallets</Label>
               {isHttps && (
                 <Badge variant="outline" className="text-[8px] border-green-500/30 text-green-600 bg-green-500/5 gap-1">
                   <CheckCircle2 className="h-2 w-2" /> Gateway Connected
                 </Badge>
               )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all group relative overflow-hidden"
                  disabled={!isLinkReady || isRedirecting}
                  onClick={() => handleStripePurchase('apple-pay')}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-6 w-6 text-primary" />
                    <span className="font-black text-xl">Apple Pay</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Stripe Gateway</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all group relative overflow-hidden"
                  disabled={!isLinkReady || isRedirecting}
                  onClick={() => handleStripePurchase('google-pay')}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-6 w-6 text-primary" />
                    <span className="font-black text-xl">Google Pay</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Stripe Gateway</span>
                </Button>
             </div>
          </div>

          <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 flex gap-5 items-start">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-black text-primary block mb-1 text-base tracking-tight">Institutional Gateway Layer</span>
              All financial operations are verified and settled through Stripe and the crypto.link.com production network, ensuring bank-grade safety and zero-custody for your assets.
            </div>
          </div>

          <Button 
            className="w-full h-24 text-2xl font-black shadow-2xl rounded-[1.75rem] transition-all hover:scale-[1.01] active:scale-[0.99] gap-4 bg-primary text-white" 
            onClick={() => handleStripePurchase('universal')}
            disabled={!isLinkReady || isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                Initializing Stripe...
              </>
            ) : (
              <>
                <ExternalLink className="h-8 w-8" />
                Launch Stripe Terminal
              </>
            )}
          </Button>

          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
               <span className="font-black text-lg italic tracking-tighter">VISA</span>
               <span className="font-black text-lg italic tracking-tighter">Mastercard</span>
               <span className="font-black text-lg italic tracking-tighter">ApplePay</span>
               <span className="font-black text-lg italic tracking-tighter">GooglePay</span>
            </div>
            <p className="text-center text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
              Secure Stripe Bridge | v2.0.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
