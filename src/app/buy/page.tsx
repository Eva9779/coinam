
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, AlertCircle, ArrowLeft, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import Script from 'next/script';

const STRIPE_ONRAMP_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

declare global {
  interface Window {
    StripeOnramp?: any;
  }
}

export default function BuyCryptoPage() {
  const { assets, initialized, user } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [onrampLoaded, setOnrampLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const onrampRef = useRef<HTMLDivElement>(null);

  const isConfigMissing = !STRIPE_ONRAMP_PUBLISHABLE_KEY || 
                          STRIPE_ONRAMP_PUBLISHABLE_KEY === '' || 
                          STRIPE_ONRAMP_PUBLISHABLE_KEY.includes('replace_with_your_key');

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const handleBuy = async () => {
    if (isConfigMissing) {
      toast({
        title: "Configuration Required",
        description: "Please update your .env file with real Stripe API keys.",
        variant: "destructive"
      });
      return;
    }

    // Direct check for the SDK
    if (!window.StripeOnramp) {
      setScriptError(true);
      toast({
        title: "Gateway Connection Error",
        description: "The Stripe security module failed to initialize. This can be caused by ad-blockers or browser security settings.",
        variant: "destructive"
      });
      return;
    }

    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset) {
      toast({
        title: "Target Wallet Required",
        description: "Please select a destination wallet for your purchase.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { clientSecret } = await createOnrampSession(asset.address);
      
      const onrampInstance = window.StripeOnramp(STRIPE_ONRAMP_PUBLISHABLE_KEY);
      
      if (onrampRef.current && onrampInstance) {
        onrampRef.current.innerHTML = ''; 
        
        const session = onrampInstance.createSession({ clientSecret });
        session.mount('#stripe-onramp-element');
        
        setOnrampLoaded(true);
        toast({
          title: "Secure Session Started",
          description: "Stripe payment gateway is now active.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Session Failed",
        description: error.message || "Could not establish a secure purchase tunnel.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const forceReloadScript = () => {
    window.location.reload();
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Vault State...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Script 
        src="https://js.stripe.com/v3/crypto-onramp.js" 
        strategy="lazyOnload"
        onLoad={() => {
          setScriptError(false);
          console.log("Stripe Onramp SDK Loaded Successfully");
        }}
        onError={() => {
          setScriptError(true);
          console.error("Stripe Onramp SDK Failed to Load");
        }}
      />
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/wallet">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-secondary" />
            Fiat Gateway
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Provision assets via Stripe secure on-chain protocol.</p>
        </div>
      </div>

      {scriptError && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive shadow-lg animate-in fade-in slide-in-from-top-4">
          <ShieldAlert className="h-5 w-5" />
          <div className="ml-2 flex-1">
            <AlertTitle className="font-bold flex items-center gap-2">
              Gateway Connection Blocked
            </AlertTitle>
            <AlertDescription className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm max-w-xl">
                The Stripe security module was blocked. This is typically caused by <strong>Ad-Blockers</strong>, <strong>Brave Shields</strong>, or <strong>Enhanced Tracking Protection</strong>. 
                Please disable these features for this site to enable payments.
              </p>
              <Button size="sm" variant="destructive" onClick={forceReloadScript} className="font-bold gap-2 shrink-0">
                <RefreshCw className="h-4 w-4" /> Force Reconnect
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {isConfigMissing && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <div className="ml-2">
            <AlertTitle className="font-bold">Missing Network Keys</AlertTitle>
            <AlertDescription className="space-y-4 pt-2">
              <p className="text-sm font-medium">
                Stripe API keys are missing. Ensure <code>STRIPE_SECRET_KEY</code> is configured in your production environment.
              </p>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {assets.length === 0 ? (
        <Card className="border-dashed border-2 py-20 bg-muted/10 text-center">
          <CardContent className="space-y-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h3 className="text-xl font-bold uppercase tracking-tight">Syncing Network Endpoints...</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Please wait while we synchronize your decentralized identities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Purchase Configuration</CardTitle>
                <CardDescription className="text-xs uppercase font-bold opacity-60">Authorize Broadcast</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Target Endpoint</Label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger className="h-12 font-semibold bg-background/50 border-2">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(a => (
                        <SelectItem key={a.currency} value={a.currency}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{a.currency}</span>
                            <span className="text-[10px] opacity-50 font-mono">{a.address.slice(0, 14)}...</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-secondary/5 rounded-xl border border-secondary/20 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed font-medium">
                    <span className="font-bold text-secondary block mb-1">Vault Sync Active</span>
                    Assets will be visible across all your authenticated devices once confirmed.
                  </div>
                </div>

                {!onrampLoaded && (
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-lg rounded-xl transition-all" 
                    onClick={handleBuy}
                    disabled={loading || !selectedAsset}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                    {loading ? "Authorizing..." : "Initiate Gateway"}
                  </Button>
                )}

                {onrampLoaded && (
                  <Button 
                    variant="outline"
                    className="w-full h-10 text-xs font-bold rounded-lg border-dashed" 
                    onClick={() => setOnrampLoaded(false)}
                  >
                    Reset Connection
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 min-h-[600px]">
            <Card className="h-full min-h-[650px] shadow-2xl border-none bg-card relative overflow-hidden rounded-3xl">
              {!onrampLoaded && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 select-none opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent">
                  <div className="h-32 w-32 rounded-full border-4 border-dashed border-primary/20 mb-6 flex items-center justify-center">
                    <CreditCard className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold uppercase tracking-widest">Secure Checkout</h3>
                  <p className="max-w-xs mt-4 text-sm font-medium">Authorize the "Initiate Gateway" action to open the Stripe portal.</p>
                </div>
              )}
              
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <span className="font-bold uppercase tracking-widest text-xs text-primary">Establishing Multi-Chain Connection...</span>
                </div>
              )}

              <div id="stripe-onramp-element" ref={onrampRef} className="w-full h-full min-h-[650px]" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
