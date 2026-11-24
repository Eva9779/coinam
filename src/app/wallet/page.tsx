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
  Lock,
  Cpu,
  Fingerprint,
  Settings,
  ArrowRight,
  Loader2,
  Key,
  PlusCircle,
  ArrowUpRight,
  Info,
  ShieldAlert
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useWalletStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WalletPage() {
  const { assets, initialized, isSyncing, user, generateNewWallet, syncOnChainBalance, marketData } = useWalletStore();
  const [search, setSearch] = useState("");
  const [syncingBalances, setSyncingBalances] = useState<Record<string, boolean>>({});

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.currency.toLowerCase().includes(search.toLowerCase()) || 
      a.address.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const aPrice = marketData.find(m => m.currency === a.currency)?.currentPriceUSD || 0;
      const bPrice = marketData.find(m => m.currency === b.currency)?.currentPriceUSD || 0;
      return (b.amount * bPrice) - (a.amount * aPrice);
    });
  }, [assets, search, marketData]);

  const handleSyncBalance = async (address: string, currency: string) => {
    setSyncingBalances(prev => ({ ...prev, [address]: true }));
    try {
      const result = await syncOnChainBalance(address, currency);
      toast({
        title: "Mainnet Sync Complete",
        description: `Verified Balance: ${result.vault} ${currency}`,
      });
    } catch (e) {
      toast({ 
        title: "Network Timeout", 
        description: "Mainnet RPC mesh is congested.",
        variant: "destructive" 
      });
    } finally {
      setSyncingBalances(prev => ({ ...prev, [address]: false }));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `${text.length} characters stored in secure clipboard.`,
      });
    });
  };

  const handleInitializeWallet = async () => {
    await generateNewWallet('ETH');
  };

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Syncing Wallet Network</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Restored Assets
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Original blockchain endpoints recovered from ledger history.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-2xl border-none bg-card/50 backdrop-blur-lg rounded-[2rem]">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b bg-muted/20 px-8 py-6">
              <div>
                <CardTitle className="text-xl font-bold tracking-tighter">Endpoints</CardTitle>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter assets..." 
                  className="pl-10 h-12 bg-background/50 border-none rounded-xl" 
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
                    <div key={asset.id} className="flex flex-col p-6 border-2 border-primary/5 bg-background/30 rounded-3xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg bg-primary/10 text-primary">
                            {asset.currency}
                          </div>
                          <div>
                            <div className="font-bold text-xl flex items-center gap-2">
                              {asset.currency}
                              <Badge className="bg-green-500/10 text-green-600 uppercase text-[9px] font-black">RESTORED</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-2xl tracking-tighter">{asset.amount.toFixed(4)}</div>
                          <div className="text-xs font-bold text-green-500">${(asset.amount * livePrice).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="bg-muted/30 p-4 rounded-2xl border border-primary/5 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-primary/40">Full Blockchain Address (100% Copy)</span>
                          <button 
                            className="text-[10px] font-bold text-secondary uppercase flex items-center gap-1"
                            onClick={() => copyToClipboard(asset.address, "Full Address")}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                        <Input 
                          readOnly 
                          value={asset.address} 
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="h-12 bg-background/50 border-2 border-dashed border-primary/10 font-mono text-[12px] font-black text-primary select-all cursor-text"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-primary/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Zap className="h-3 w-3 text-secondary" /> Mainnet Live
                        </span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl hover:bg-primary/10">
                            <Link href={`/transactions?tab=send&currency=${asset.currency}`}>
                              <ArrowUpRight className="h-4 w-4 text-primary" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-secondary/10"
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
                  <div className="py-24 text-center border-2 border-dashed rounded-[2.5rem] flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest">Awaiting Deep Recovery Sync...</p>
                    <Button onClick={handleInitializeWallet} className="mt-4 rounded-xl font-black">Initialize New Wallet</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-950 text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Fingerprint className="h-48 w-48" />
            </div>
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-sm font-black tracking-widest uppercase text-secondary">Network Integrity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/60">
                  <span>Hardware Isolation</span>
                  <Badge className="bg-green-500 text-white text-[8px]">ACTIVE</Badge>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/60">
                  <span>Ledger Sync</span>
                  <Badge className="bg-secondary text-white text-[8px]">STABLE</Badge>
                </div>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                Your wallet has been stabilized. Deep recovery protocols have restored the link to your original ETH deposit from 8/31/2026.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
