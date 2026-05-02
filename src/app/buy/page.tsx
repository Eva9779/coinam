
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, ArrowLeft, Zap, Info, ShieldAlert, AlertCircle, ExternalLink } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import { loadStripeOnramp } from "@stripe/crypto";
import { CryptoElements, OnrampElement } from "@/components/stripe/crypto-elements";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Institutional Stripe Publishable Key
const stripeOnrampPromise = loadStripeOnramp("pk_live_51SxgIgEvvi2LpIks4TBzOf2rLTJpKWE5Poq8EzDf3cTM7bKepsZoNk2AUvf1TMN3Br0das4LW2kHHfqlIvBL548i009kh8Iz7t");

export default function BuyCryptoPage() {
  const { assets, initialized } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isHttps, setIsHttps] = useState(true);
  const [onrampMessage, setOnrampMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const handleFetchClientSecret = useCallback(async () => {
    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) return;

    setIsInitializing(true);
    setClientSecret('');
    setError(null);
    setOnrampMessage('');
    
    try {
      const result = await createOnrampSession(asset.address, '13.37', selectedAsset);
      
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
      } else {
        setError(result.error || "Stripe could not provision a session for this region.");
      }
    } catch (e: any) {
      setError(e.message || "Gateway connection interrupted.");
    } finally {
      setIsInitializing(false);
    }
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (selectedAsset && assets.length > 0) {
      handleFetchClientSecret();
    }
  }, [selectedAsset, assets.length, handleFetchClientSecret]);

  const onOnrampSessionChange = useCallback(({ session }: any) => {
    setOnrampMessage(`Stripe Session: ${session.status.replace('_', ' ')}`);
    if (session.status === 'fulfillment_complete') {
      toast({
        title: "Transaction Successful",
        description: "Your vault has been funded.",
      });
    }
  }, []);

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Vault State...</p>
      </div>
    );
  }

  const currentAsset = assets.find(a => a.currency === selectedAsset);

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
            <p className="text-muted-foreground text-sm font-medium">Embedded Stripe Crypto Onramp & Institutional Fallback Bridge.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Gateway Active v2.2.0
        </Badge>
      </div>

      {!isHttps && (
        <div className="p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] flex items-start gap-5 shadow-sm">
          <ShieldAlert className="h-8 w-8 text-amber-600 shrink-0" />
          <div className="text-sm">
            <span className="font-black text-amber-700 block mb-1 uppercase tracking-tight text-xs">Security Requirement</span>
            <p className="leading-relaxed font-medium">
              Stripe Crypto Elements require a **Production HTTPS** connection. 
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
        <CardHeader className="border-b bg-muted/20 pb-8 px-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Provisioning Terminal</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Stripe & Manual Fallback Protocol</CardDescription>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border shadow-inner">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-10 px-8 pb-10">
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-70">Target Vault Address</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="h-20 text-xl font-black bg-background/50 border-2 rounded-3xl transition-all hover:border-primary/50">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl p-2 border-2 shadow-2xl">
                {assets.length > 0 ? assets.map(a => (
                  <SelectItem key={a.id} value={a.currency} className="rounded-xl h-14 mb-1">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-xs font-black border uppercase">{a.currency}</div>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm">{a.currency} Vault Key</span>
                        <span className="text-[10px] opacity-50 font-mono font-bold tracking-tighter">{a.address.slice(0, 16)}...</span>
                      </div>
                    </div>
                  </SelectItem>
                )) : (
                  <SelectItem value="none" disabled>No assets available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-[500px] border-2 border-dashed border-primary/10 rounded-3xl p-4 bg-muted/5 flex flex-col items-center justify-center relative overflow-hidden">
            {clientSecret ? (
              <div className="w-full h-full flex flex-col items-center">
                <p className="text-center text-[10px] font-black text-primary mb-6 uppercase tracking-widest animate-pulse">
                  Stripe Secure Enclave Initialized
                </p>
                <CryptoElements stripeOnramp={stripeOnrampPromise}>
                  <OnrampElement
                    id="onramp-element"
                    clientSecret={clientSecret}
                    appearance={{ theme: "light" }}
                    onChange={onOnrampSessionChange}
                    className="w-full"
                  />
                </CryptoElements>
                {onrampMessage && (
                   <div id="onramp-message" className="mt-4 font-bold text-xs uppercase tracking-tighter text-muted-foreground">
                     {onrampMessage}
                   </div>
                )}
              </div>
            ) : isInitializing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Connection...</p>
              </div>
            ) : (
              <div className="text-center space-y-6 max-w-sm px-4">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
                   <ShieldAlert className="h-10 w-10 text-primary opacity-40" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-primary uppercase tracking-tight">Regional Fallback Active</h4>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                    Stripe direct-onramp is currently limited in your jurisdiction. Use our **Institutional Fallback Gateway** to complete your funding.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" className="rounded-2xl h-14 font-black shadow-xl gap-2 w-full" asChild>
                    <a href={`https://crypto.link.com/buy?wallet=${currentAsset?.address}&asset=${selectedAsset?.toLowerCase()}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5" />
                      Open Fallback Gateway
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFetchClientSecret} className="rounded-xl font-bold h-10">
                    Retry Stripe Connection
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 flex gap-5 items-start">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-black text-primary block mb-1 text-base tracking-tight">Multi-Protocol Routing</span>
              CoinVault automatically routes your transaction through the most available secure gateway for your region.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
