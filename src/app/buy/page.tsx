'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CreditCard, Loader2, ArrowLeft, Zap, ExternalLink, Smartphone } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function BuyCryptoPage() {
  const { assets, initialized } = useVaultStore();
  const [selectedAsset, setSelectedAsset] = useState<string>('');

  useEffect(() => {
    if (initialized && assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0].currency);
    }
  }, [initialized, assets, selectedAsset]);

  const getGatewayUrl = (method?: string) => {
    const asset = assets.find(a => a.currency === selectedAsset);
    if (!asset || !asset.address) return '#';
    const baseUrl = `https://crypto.link.com/?wallet=${asset.address}&network=ethereum&asset=${selectedAsset.toLowerCase()}`;
    return method ? `${baseUrl}&method=${method}` : baseUrl;
  };

  const handleLinkClick = (method: string = 'universal') => {
    toast({
      title: `${method.toUpperCase()} Gateway Active`,
      description: `Redirecting to secure ${method} checkout terminal...`,
    });
    
    window.open(getGatewayUrl(method), '_blank', 'noopener,noreferrer');
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Vault State...</p>
      </div>
    );
  }

  const asset = assets.find(a => a.currency === selectedAsset);
  const isLinkReady = !!asset && !!asset.address;

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
            Universal Gateway
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Provision assets via high-performance external protocols.</p>
        </div>
      </div>

      <Card className="shadow-2xl border-primary/10 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-muted/20 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">External Provisioning</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold opacity-60 tracking-widest mt-1">Direct Checkout Integration</CardDescription>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Target Vault Address</Label>
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

          <div className="space-y-4">
             <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Select Payment Method</Label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group"
                  disabled={!isLinkReady}
                  onClick={() => handleLinkClick('apple-pay')}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">Apple Pay</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Instant Confirmation</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group"
                  disabled={!isLinkReady}
                  onClick={() => handleLinkClick('google-pay')}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">Google Pay</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Zero-Wait Funding</span>
                </Button>
             </div>
          </div>

          <div className="p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 flex gap-4 items-start">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-primary block mb-1 text-base">Secure Checkout Terminal</span>
              Apple Pay and Google Pay are handled directly within the external secure checkout terminal to ensure your biometric data never leaves your device.
            </div>
          </div>

          <Button 
            className="w-full h-20 text-2xl font-black shadow-2xl rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] gap-3" 
            onClick={() => handleLinkClick('universal')}
            disabled={!isLinkReady}
          >
            <ExternalLink className="h-8 w-8" />
            Launch Universal Portal
          </Button>

          <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Verified External Gateway | Crypto.link.com Secure | Apple & Google Pay Ready
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
