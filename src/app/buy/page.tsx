
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, ArrowLeft, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const STRIPE_ONRAMP_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function BuyCryptoPage() {
  const { assets, initialized } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfigMissing = !STRIPE_ONRAMP_PUBLISHABLE_KEY || 
                          STRIPE_ONRAMP_PUBLISHABLE_KEY === '' || 
                          STRIPE_ONRAMP_PUBLISHABLE_KEY.includes('replace_with_your_key');

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const handleBuyRedirect = async () => {
    setErrorMessage(null);
    if (isConfigMissing) {
      toast({
        title: "Configuration Required",
        description: "Please update your .env file with real Stripe API keys.",
        variant: "destructive"
      });
      return;
    }

    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) {
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
      
      const redirectUrl = `https://onramp.stripe.com/onramp?client_secret=${clientSecret}&publishable_key=${STRIPE_ONRAMP_PUBLISHABLE_KEY}`;
      
      toast({
        title: "Redirecting to Stripe",
        description: "Launching the secure standalone gateway...",
      });

      window.location.href = redirectUrl;
    } catch (error: any) {
      const msg = error.message || "Could not establish a secure purchase tunnel.";
      setErrorMessage(msg);
      toast({
        title: "Gateway Error",
        description: msg,
        variant: "destructive"
      });
      setLoading(false);
    }
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
    <div className="max-w-4xl mx-auto space-y-8">
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
          <p className="text-muted-foreground text-sm font-medium">Provision assets via Stripe secure Standalone protocol.</p>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold">Gateway Connection Failed</AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage}
            <div className="mt-2 text-xs opacity-70">
              Ensure your Stripe account has **Crypto Onramp** enabled in the Stripe Dashboard and that you are using restricted keys if necessary.
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-muted/20 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Direct Purchase</CardTitle>
              <CardDescription className="text-xs uppercase font-bold opacity-60 tracking-widest mt-1">Stripe Standalone Integration</CardDescription>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Target Endpoint</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="h-16 text-lg font-bold bg-background/50 border-2 rounded-2xl">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {assets.map(a => (
                  <SelectItem key={a.id} value={a.currency}>
                    <div className="flex items-center gap-3 py-1">
                      <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-xs font-black">{a.currency}</div>
                      <div className="flex flex-col">
                        <span className="font-bold">{a.currency} Wallet</span>
                        <span className="text-[10px] opacity-50 font-mono tracking-tighter">{a.address}</span>
                      </div>
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
              <span className="font-bold text-secondary block mb-1 text-base">Direct On-Chain Settlement</span>
              You are initiating a direct purchase session. Stripe will verify your identity and broadcast the assets directly to your vault address on the Ethereum network.
            </div>
          </div>

          <Button 
            className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] gap-3" 
            onClick={handleBuyRedirect}
            disabled={loading || !selectedAsset}
          >
            {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <ExternalLink className="h-8 w-8" />}
            {loading ? "Establishing Link..." : "Launch Stripe Gateway"}
          </Button>

          <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Secured by Stripe Identity and Anti-Fraud Network
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
