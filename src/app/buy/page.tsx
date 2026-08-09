'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShieldCheck, 
  CreditCard, 
  Loader2, 
  ArrowLeft, 
  Zap, 
  ShieldAlert, 
  ExternalLink, 
  Landmark,
  Smartphone,
  Globe,
  Layers
} from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import { loadStripeOnramp } from "@stripe/crypto";
import { CryptoElements, OnrampElement } from "@/components/stripe/crypto-elements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      const result = await createOnrampSession(asset.address, '50.00', selectedAsset);
      
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
    setOnrampMessage(`Gateway Status: ${session.status.replace('_', ' ')}`);
    if (session.status === 'fulfillment_complete') {
      toast({
        title: "Provisioning Successful",
        description: "Your vault is being funded via Stripe network.",
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
  
  /**
   * Corrected Onramper Link for Jamaica
   */
  const onramperUrl = currentAsset?.address 
    ? `https://buy.onramper.com/?themeName=dark&containerColor=020617&primaryColor=3f51b5&walletAddress=${currentAsset.address}&defaultCrypto=${selectedAsset.toLowerCase()}`
    : "#";

  /**
   * Sardine Institutional URL
   */
  const sardineUrl = currentAsset?.address
    ? `https://crypto.sardine.ai/?address=${currentAsset.address}&asset=${selectedAsset === 'BTC' ? 'WBTC' : selectedAsset}&network=ethereum&fiatCurrency=USD`
    : "#";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
              <Globe className="h-8 w-8 text-secondary" />
              Institutional Funding
            </h2>
            <p className="text-muted-foreground text-sm font-medium">Multi-protocol gateway supporting Cards, Mobile Pay, and Bank Transfers.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 px-3 py-1 gap-1.5 font-bold uppercase text-[10px]">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Bridge Connected
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="border-b bg-muted/20 pb-6 px-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Select Funding Path</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Cross-Border Liquidity Protocol</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 px-8 pb-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Target Vault Address</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="h-16 text-lg font-bold bg-background/50 border-2 rounded-2xl transition-all hover:border-primary/50">
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

              <Tabs defaultValue="onramper" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="onramper" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Layers className="h-4 w-4" />
                    Aggregator
                  </TabsTrigger>
                  <TabsTrigger value="stripe" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Smartphone className="h-4 w-4" />
                    Apple/Google
                  </TabsTrigger>
                  <TabsTrigger value="sardine" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Landmark className="h-4 w-4" />
                    Bank ACH
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="onramper" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform rotate-3">
                      <Globe className="h-10 w-10 text-secondary" />
                    </div>
                    
                    <div className="space-y-2 max-w-xs mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight">Onramper Global</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        The most reliable path for users in **Jamaica**. Pools multiple providers (Transak, Banxa, etc.) to ensure high card success rates.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Methods</span>
                        <p className="text-xs font-bold">Visa / MC / Local</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Region</span>
                        <p className="text-xs font-bold">International (JM)</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-secondary text-secondary-foreground" 
                      disabled={!currentAsset?.address}
                      asChild
                    >
                      <a href={onramperUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-6 w-6" />
                        Initialize Global Bridge
                      </a>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-6 mt-6">
                  {!isHttps && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                        Production HTTPS required for Stripe Mobile Pay.
                      </p>
                    </div>
                  )}

                  <div className="min-h-[400px] border-2 border-dashed border-primary/10 rounded-[2rem] p-4 bg-muted/5 flex flex-col items-center justify-center relative overflow-hidden">
                    {clientSecret ? (
                      <div className="w-full flex flex-col items-center">
                        <p className="text-center text-[10px] font-black text-primary mb-6 uppercase tracking-widest animate-pulse">
                          Secure Element Initialized
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
                      </div>
                    ) : isInitializing ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Rail...</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-6 max-max-sm px-4 py-10">
                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
                           <ShieldAlert className="h-8 w-8 text-primary opacity-40" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-black text-primary uppercase tracking-tight">Regional Filter Active</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            Stripe Direct is limited in certain jurisdictions. Use the **Global Aggregator** for Jamaican cards.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleFetchClientSecret} className="rounded-xl font-bold h-10 w-full">
                          Retry High-Speed Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sardine" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform rotate-3">
                      <Landmark className="h-10 w-10 text-secondary" />
                    </div>
                    <div className="space-y-2 max-w-xs mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight">Sardine ACH</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Fund via bank transfer (ACH/Wire). Optimized for high-limit funding with lower fees.
                      </p>
                    </div>
                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl bg-secondary text-secondary-foreground" 
                      disabled={!currentAsset?.address}
                      asChild
                    >
                      <a href={sardineUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-6 w-6" />
                        Initialize Sardine Bridge
                      </a>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] shadow-xl border-none bg-primary text-primary-foreground overflow-hidden relative p-8">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="h-48 w-48" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-secondary" />
              Protocol Info
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                     <Layers className="h-3.5 w-3.5" />
                   </div>
                   <p className="text-[10px] font-medium leading-relaxed">Onramper uses 15+ providers (Transak, Banxa, etc.) to ensure Jamaican cards are accepted.</p>
                </div>
                <div className="flex items-start gap-3">
                   <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                     <Smartphone className="h-3.5 w-3.5" />
                   </div>
                   <p className="text-[10px] font-medium leading-relaxed">Use Stripe for instant liquidity via Apple/Google Pay in supported regions.</p>
                </div>
                <div className="flex items-start gap-3">
                   <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                     <Landmark className="h-3.5 w-3.5" />
                   </div>
                   <p className="text-[10px] font-medium leading-relaxed">Use Sardine for high-limit bank transfers via ACH with instant delivery.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
