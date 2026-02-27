
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, AlertCircle, ArrowLeft, Plus, ExternalLink } from 'lucide-react';
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
  const { assets, initialized, generateNewWallet } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [onrampLoaded, setOnrampLoaded] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const onrampRef = useRef<HTMLDivElement>(null);

  const isConfigMissing = !STRIPE_ONRAMP_PUBLISHABLE_KEY || STRIPE_ONRAMP_PUBLISHABLE_KEY.startsWith('pk_test_...');

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const handleBuy = async () => {
    if (!STRIPE_ONRAMP_PUBLISHABLE_KEY || STRIPE_ONRAMP_PUBLISHABLE_KEY.includes('...')) {
      toast({
        title: "Configuration Missing",
        description: "Please set your NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in the .env file.",
        variant: "destructive"
      });
      return;
    }

    if (!window.StripeOnramp) {
      toast({
        title: "SDK Error",
        description: "Stripe Onramp SDK is not loaded yet. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset) {
      toast({
        title: "Asset Error",
        description: "Please select a valid wallet destination.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { clientSecret } = await createOnrampSession(asset.address);
      
      const onramp = window.StripeOnramp(STRIPE_ONRAMP_PUBLISHABLE_KEY);
      
      if (onrampRef.current && onramp) {
        onrampRef.current.innerHTML = ''; 
        const session = onramp.createSession({ clientSecret });
        session.mount(onrampRef.current);
        setOnrampLoaded(true);
        toast({
          title: "Session Initialized",
          description: "Secure gateway is ready for purchase.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Session Failed",
        description: error.message || "Could not initialize Stripe onramp.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickProvision = () => {
    const addr = generateNewWallet('ETH');
    setSelectedAsset('ETH');
    toast({
      title: "Wallet Provisioned",
      description: `New ETH address created: ${addr.slice(0, 10)}...`,
    });
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Script 
        src="https://js.stripe.com/v3/crypto-onramp.js" 
        onLoad={() => setSdkReady(true)}
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
          <p className="text-muted-foreground text-sm">Purchase crypto directly into your secure vault.</p>
        </div>
      </div>

      {isConfigMissing && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Stripe Configuration Required</AlertTitle>
          <AlertDescription className="space-y-4 pt-2">
            <p className="text-sm">
              The Fiat Gateway requires Stripe API keys to function. Please add your 
              <strong> NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</strong> and 
              <strong> STRIPE_SECRET_KEY</strong> to your environment variables or <code>.env</code> file.
            </p>
            <Button variant="outline" size="sm" className="bg-white hover:bg-white/90 text-destructive border-destructive/20 font-bold" asChild>
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-2" /> Get API Keys from Stripe
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {assets.length === 0 ? (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-secondary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold">No Active Wallets</h3>
              <p className="text-muted-foreground text-sm">You need a provisioned wallet endpoint before you can purchase assets from the fiat gateway.</p>
            </div>
            <Button size="lg" onClick={handleQuickProvision} className="font-bold gap-2">
              <Plus className="h-4 w-4" /> Provision ETH Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Configure Purchase</CardTitle>
                <CardDescription>Select destination and authorize fiat gateway.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Destination Asset</Label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger className="h-12 font-semibold">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(a => (
                        <SelectItem key={a.currency} value={a.currency}>
                          {a.currency} - {a.address.slice(0, 10)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-secondary/5 rounded-xl border border-secondary/20 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold text-secondary block mb-1">Secure Direct Deposit</span>
                    Assets purchased via Stripe are transmitted directly to your mainnet address.
                  </div>
                </div>

                {!onrampLoaded && (
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-lg" 
                    onClick={handleBuy}
                    disabled={loading || !selectedAsset || !sdkReady || isConfigMissing}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CreditCard className="h-5 w-5 mr-2" />}
                    {loading ? "Establishing Link..." : "Proceed to Buy"}
                  </Button>
                )}

                {onrampLoaded && (
                  <Button 
                    variant="outline"
                    className="w-full h-10 text-xs font-bold" 
                    onClick={() => {
                      setOnrampLoaded(false);
                      if (onrampRef.current) onrampRef.current.innerHTML = '';
                    }}
                  >
                    Cancel & Reset
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-dashed border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                  <AlertCircle className="h-4 w-4" />
                  Compliance Notice
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Fiat-to-crypto services are provided by Stripe. KYC verification may be required during the transaction. CoinVault does not store your payment information.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 min-h-[600px] flex flex-col">
            <Card className="flex-1 shadow-2xl border-none bg-card/50 backdrop-blur-md relative overflow-hidden">
              {!onrampLoaded && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 opacity-30 select-none">
                  <div className="h-32 w-32 rounded-full border-4 border-dashed border-primary mb-6 animate-spin-slow" />
                  <h3 className="text-2xl font-bold uppercase tracking-widest">Awaiting Session</h3>
                  <p className="max-w-xs mt-4 font-medium">Configure your destination asset to begin the secure purchase flow.</p>
                </div>
              )}
              
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
                  <span className="font-bold uppercase tracking-widest text-sm text-secondary">Establishing Secure Link...</span>
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
