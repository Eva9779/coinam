
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, AlertCircle, ArrowLeft, Plus, ExternalLink, CheckCircle2 } from 'lucide-react';
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

  // Check if keys are placeholders or empty
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

    if (!window.StripeOnramp) {
      toast({
        title: "SDK Loading Error",
        description: "Stripe Onramp SDK failed to initialize. Please ensure ad-blockers are disabled and refresh the page.",
        variant: "destructive"
      });
      return;
    }

    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset) {
      toast({
        title: "Wallet Selection",
        description: "Please select a valid destination wallet.",
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
          title: "Gateway Connected",
          description: "Stripe secure purchase session is now active.",
        });
      }
    } catch (error: any) {
      console.error('Stripe initialization failed:', error);
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to establish a secure onramp session.",
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
      description: `New ETH address: ${addr.slice(0, 10)}...`,
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
    <div className="max-w-7xl mx-auto space-y-8">
      <Script 
        src="https://js.stripe.com/v3/crypto-onramp.js" 
        strategy="afterInteractive"
        onLoad={() => {
          setSdkReady(true);
          console.log("Stripe Onramp SDK Loaded Successfully");
        }}
        onError={(e) => {
          console.error("Stripe Script Error:", e);
          toast({ 
            title: "SDK Load Failure", 
            description: "Browser blocked the Stripe script. Please disable Ad-Blockers or Shields and refresh.", 
            variant: "destructive" 
          });
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
          <p className="text-muted-foreground text-sm">Convert local currency into secure on-chain assets via Stripe.</p>
        </div>
      </div>

      {isConfigMissing && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive shadow-lg">
          <AlertCircle className="h-5 w-5" />
          <div className="ml-2">
            <AlertTitle className="font-bold">Stripe Configuration Required</AlertTitle>
            <AlertDescription className="space-y-4 pt-2">
              <p className="text-sm">
                Your Stripe keys are missing. Please add <code>STRIPE_SECRET_KEY</code> and <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to your <code>.env</code> file.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-2" /> Get API Keys
                </a>
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {assets.length === 0 ? (
        <Card className="border-dashed border-2 py-12 bg-muted/20">
          <CardContent className="flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold">No Destination Address</h3>
              <p className="text-muted-foreground text-sm">You need a provisioned wallet endpoint to receive assets.</p>
            </div>
            <Button size="lg" onClick={handleQuickProvision} className="font-bold gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Provision ETH Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Configure Purchase</CardTitle>
                <CardDescription>Select destination and amount.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Target Wallet</Label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger className="h-12 font-semibold bg-background/50">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(a => (
                        <SelectItem key={a.currency} value={a.currency}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{a.currency}</span>
                            <span className="text-xs opacity-50">{a.address.slice(0, 10)}...</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-secondary/5 rounded-xl border border-secondary/20 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold text-secondary block mb-1">Stripe Security</span>
                    Transactions are handled by Stripe's encrypted payment network. Ensure your domain is authorized in the Stripe Dashboard.
                  </div>
                </div>

                {!onrampLoaded && (
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-lg rounded-xl transition-all" 
                    onClick={handleBuy}
                    disabled={loading || !selectedAsset}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CreditCard className="h-5 w-5 mr-2" />}
                    {loading ? "Initializing..." : "Proceed to Buy"}
                  </Button>
                )}

                {onrampLoaded && (
                  <Button 
                    variant="outline"
                    className="w-full h-10 text-xs font-bold rounded-lg border-dashed" 
                    onClick={() => setOnrampLoaded(false)}
                  >
                    Refresh Session
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Requirements</h4>
              <div className="space-y-2">
                {["Live Key Configuration", "Stripe Onramp Enabled", "Domain Authorization"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium bg-muted/30 p-2 rounded-lg border border-border/50">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 min-h-[600px]">
            <Card className="h-full min-h-[650px] shadow-2xl border-none bg-card relative overflow-hidden rounded-3xl">
              {!onrampLoaded && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 select-none opacity-40">
                  <div className="h-32 w-32 rounded-full border-4 border-dashed border-primary/20 mb-6 flex items-center justify-center">
                    <CreditCard className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold uppercase tracking-widest">Secure Checkout</h3>
                  <p className="max-w-xs mt-4 text-sm">Click "Proceed to Buy" to initialize the Stripe payment gateway.</p>
                </div>
              )}
              
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-20">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <span className="font-bold uppercase tracking-widest text-xs text-primary">Establishing Secure Connection...</span>
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
