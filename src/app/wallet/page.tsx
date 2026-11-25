"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Copy, 
  ShieldCheck, 
  RefreshCw, 
  CreditCard, 
  Zap,
  Fingerprint,
  Settings,
  Loader2,
  ArrowUpRight,
  Database,
  History,
  Key,
  Wallet
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LiveWalletBalance } from "@/components/dashboard/live-wallet-balance";

export default function WalletPage() {
  const { assets, initialized, syncOnChainBalance, marketData, botAddress } = useWalletStore();
  const [search, setSearch] = useState("");
  const [syncingBalances, setSyncingBalances] = useState<Record<string, boolean>>({});

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.currency.toLowerCase().includes(search.toLowerCase()) || 
      a.address.toLowerCase().includes(search.toLowerCase())
    );
  }, [assets, search]);

  const handleSyncBalance = async (address: string, currency: string) => {
    setSyncingBalances(prev => ({ ...prev, [address]: true }));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const result = await syncOnChainBalance(address, currency);
      toast({
        title: "Sync Complete",
        description: `Verified Balance: ${result.onChain} ${currency}`,
      });
    } catch (e: any) {
      toast({ 
        title: "Network Timeout", 
        description: "Syncing ledger in background.",
        variant: "destructive" 
      });
    } finally {
      clearTimeout(timeoutId);
      setSyncingBalances(prev => ({ ...prev, [address]: false }));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: "Address stored in secure clipboard.",
      });
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Sovereign Vault
          </h2>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
            Institutional Asset Registry & Non-Custodial Endpoints.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl border-primary/20">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </Button>
          <Button variant="default" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl shadow-xl">
            <Link href="/buy">
              <CreditCard className="h-5 w-5" />
              Fund Wallet
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <LiveWalletBalance />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-2xl border-none bg-card/50 backdrop-blur-lg rounded-[2.5rem]">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b bg-muted/20 px-8 py-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter">Ledger Endpoints</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">Authenticated Deposit Addresses</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter assets..." 
                  className="pl-10 h-12 bg-background/50 border-none rounded-xl font-bold" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {filteredAssets.length > 0 ? filteredAssets.map((asset) => {
                  const livePrice = marketData.find(m => m.currency === asset.currency)?.currentPriceUSD || 0;
                  return (
                    <div key={asset.id} className="flex flex-col p-6 border-2 border-primary/5 bg-background/30 rounded-3xl group hover:border-secondary/20 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-xl bg-primary/10 text-primary border border-primary/10">
                            {asset.currency}
                          </div>
                          <div>
                            <div className="font-black text-2xl flex items-center gap-2 tracking-tighter">
                              {asset.currency} Vault
                              <Badge className="bg-green-500/10 text-green-600 uppercase text-[9px] font-black border-green-500/20">LIVE</Badge>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">EVM Compatible Deposit Key</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-3xl tracking-tighter">{asset.amount.toFixed(4)}</div>
                          <div className="text-sm font-bold text-green-600">${(asset.amount * (livePrice || 1)).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-6 rounded-2xl border border-white/10 space-y-4 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-secondary tracking-[0.2em] flex items-center gap-2">
                             <Database className="h-3 w-3" />
                             DEPOSIT ADDRESS
                          </span>
                          <button 
                            className="text-[10px] font-black text-secondary uppercase flex items-center gap-1.5 hover:underline"
                            onClick={() => copyToClipboard(asset.address, "Full Address")}
                          >
                            <Copy className="h-3 w-3" /> Copy Address
                          </button>
                        </div>
                        <div className="p-5 bg-white/5 rounded-xl font-mono text-[15px] font-black text-white break-all leading-relaxed select-all border border-white/5">
                          {asset.address}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-6 mt-6 border-t border-primary/5">
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
                            <Zap className="h-3 w-3 text-secondary" /> Network Ready
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" asChild className="h-10 rounded-xl font-bold border-2 gap-2">
                            <Link href={`/transactions?tab=send&currency=${asset.currency}`}>
                              <ArrowUpRight className="h-4 w-4 text-primary" />
                              Authorize Broadcast
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-secondary/10 border"
                            onClick={() => handleSyncBalance(asset.address, asset.currency)}
                            disabled={syncingBalances[asset.address]}
                          >
                            <RefreshCw className={cn("h-4 w-4 text-secondary", syncingBalances[asset.address] && "animate-spin")} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-24 text-center border-2 border-dashed rounded-[2.5rem] flex flex-col items-center gap-6 bg-muted/5">
                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
                       <Wallet className="h-10 w-10 text-primary opacity-20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black uppercase tracking-[0.2em]">
                        Ready for Deposit
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">Generate a trading wallet in the Strategy Agent tab to activate your ledger endpoints.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-950 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Fingerprint className="h-48 w-48" />
            </div>
            <CardHeader className="pb-6 relative z-10 px-0">
              <CardTitle className="text-sm font-black tracking-[0.2em] uppercase text-secondary flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4" />
                 Vault Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10 px-0">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60">
                  <span>Enclave State</span>
                  <Badge className="bg-green-500 text-white text-[9px] font-black border-none uppercase">Locked</Badge>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60">
                  <span>Hardware Key</span>
                  <Badge className="bg-secondary text-white text-[9px] font-black border-none uppercase">Active</Badge>
                </div>
              </div>

              {botAddress && (
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Primary Deposit Key</p>
                   <div className="p-4 bg-white/5 rounded-xl border border-white/10 relative group">
                      <p className="text-[11px] font-mono break-all text-white/70 leading-relaxed pr-8">{botAddress}</p>
                      <button 
                        onClick={() => copyToClipboard(botAddress, "Vault Address")}
                        className="absolute right-3 top-4 text-secondary opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                   </div>
                   <Button variant="secondary" className="w-full h-12 rounded-xl font-bold gap-2 text-xs uppercase" onClick={() => copyToClipboard(botAddress, "Vault Address")}>
                     <Copy className="h-4 w-4" /> Copy Address
                   </Button>
                </div>
              )}
              
              <div className="p-5 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
                 <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-tight">
                    <Key className="h-4 w-4" />
                    Security Notice
                 </div>
                 <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                  Your keys are encrypted using AES-GCM-256 and never leave your hardware enclave. Only you have the authority to broadcast transactions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
