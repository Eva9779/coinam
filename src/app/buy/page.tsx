
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
  Building2,
  Smartphone,
  Globe
} from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { createOnrampSession } from '@/app/lib/stripe-actions';
import { loadStripeOnramp } from "@stripe/crypto";
import { CryptoElements, OnrampElement } from "@/components/stripe/crypto-elements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Refined Transak URL Construction for Institutional ACH
  // Using production query params: apiKey, cryptoCurrencyCode, network, walletAddress, paymentMethod
  const transakApiKey = "77d7045c-2051-4191-88f5-938928c0b852";
  const transakUrl = currentAsset?.address 
    ? `https://global.transak.com/?apiKey=${transakApiKey}&walletAddress=${currentAsset.address}&cryptoCurrencyCode=${selectedAsset}&network=ethereum&paymentMethod=ach_bank_transfer&defaultPaymentMethod=ach_bank_transfer`
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

              <Tabs defaultValue="stripe" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="stripe" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <CreditCard className="h-4 w-4" />
                    Stripe (Card / Mobile)
                  </TabsTrigger>
                  <TabsTrigger value="transak" className="rounded-xl font-bold gap-2 data-[state=active]:shadow-lg">
                    <Building2 className="h-4 w-4" />
                    Transak (Bank / ACH)
                  </TabsTrigger>
                </TabsList>

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
                        {onrampMessage && (
                           <div id="onramp-message" className="mt-4 font-bold text-[10px] uppercase tracking-tighter text-muted-foreground">
                             {onrampMessage}
                           </div>
                        )}
                      </div>
                    ) : isInitializing ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Initializing Secure Rail...</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-6 max-w-sm px-4 py-10">
                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
                           <ShieldAlert className="h-8 w-8 text-primary opacity-40" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-black text-primary uppercase tracking-tight">Regional Filter Active</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            Stripe Direct is limited in your current jurisdiction. Retry or use the Bank Bridge.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleFetchClientSecret} className="rounded-xl font-bold h-10 w-full">
                          Retry High-Speed Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="transak" className="space-y-6 mt-6">
                  <div className="p-8 border-2 border-dashed border-primary/10 rounded-[2rem] bg-muted/5 space-y-8 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto border-2 border-secondary/20 shadow-xl shadow-secondary/5 transform rotate-3">
                      <Building2 className="h-10 w-10 text-secondary" />
                    </div>
                    
                    <div className="space-y-2 max-w-xs mx-auto">
                      <h4 className="text-2xl font-black text-primary tracking-tight">Transak Bank (ACH)</h4>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Fund your vault via Transak's global banking network. Supports **ACH transfers, Bank Wires, and SEPA** for institutional limits.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Methods</span>
                        <p className="text-xs font-bold">ACH / Wire / SEPA</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-background border shadow-sm space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Global</span>
                        <p className="text-xs font-bold">150+ Countries</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-secondary text-secondary-foreground" 
                      disabled={!currentAsset?.address}
                      asChild
                    >
                      <a href={transakUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-6 w-6" />
                        Initialize Transak Bridge
                      </a>
                    </Button>
                    
                    {!currentAsset?.address && (
                      <p className="text-[10px] text-destructive font-bold uppercase animate-pulse">
                        Awaiting Vault Synchronization...
                      </p>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground font-medium max-w-xs mx-auto">
                      Transak provides institutional-grade security and compliance for all bank-to-crypto transactions.
                    </p>
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
                     <Smartphone className="h-3.5 w-3.5" />
                   </div>
                   <p className="text-[10px] font-medium leading-relaxed">Use Stripe for instant liquidity with Apple/Google Pay and Debit Cards.</p>
                </div>
                <div className="flex items-start gap-3">
                   <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                     <Building2 className="h-3.5 w-3.5" />
                   </div>
                   <p className="text-[10px] font-medium leading-relaxed">Use Transak for high-limit bank transfers via ACH or Institutional Wires.</p>
                </div>
              </div>
              
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] block mb-2 opacity-60">Enclave Status</span>
                <p className="text-[10px] font-bold leading-relaxed">
                  Both gateways are non-custodial. Funds are settled directly to your unique hardware-isolated `0x` address.
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] border-dashed border-2 bg-muted/20 p-8 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-tight">Security Note</h4>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
              Always verify the domain in your browser bar when linking your bank account. Coin A,M only routes through verified Stripe and Transak domains.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
