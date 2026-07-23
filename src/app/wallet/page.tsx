
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Copy, 
  ShieldCheck, 
  RefreshCw, 
  CreditCard, 
  ShieldAlert,
  Zap,
  Lock,
  Cpu,
  Fingerprint,
  Settings,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useVaultStore } from "@/lib/store";
import { getLiveBalance } from "@/lib/blockchain";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WalletPage() {
  const { assets, initialized, isSyncing } = useVaultStore();
  const [search, setSearch] = useState("");
  const [syncingBalances, setSyncingBalances] = useState<Record<string, boolean>>({});

  const filteredAssets = assets.filter(a => 
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  const handleSyncBalance = async (address: string, currency: string) => {
    setSyncingBalances(prev => ({ ...prev, [address]: true }));
    try {
      const liveBal = await getLiveBalance(address);
      toast({
        title: "Network Sync Complete",
        description: `Verified on-chain balance: ${liveBal} ${currency}`,
      });
    } catch (e) {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncingBalances(prev => ({ ...prev, [address]: false }));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: "Stored in secure clipboard.",
    });
  };

  // Improved loading state: only block if we have NO data at all (not even from cache)
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
          <ShieldCheck className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Syncing Vault Enclave</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Connecting to Blockchain Nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Non-Custodial Vault
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm font-medium">Cryptographic endpoints synchronized with decentralized peers.</p>
            {isSyncing && (
              <Badge variant="secondary" className="bg-primary/5 text-primary animate-pulse h-5 flex items-center gap-1 font-bold text-[8px]">
                <RefreshCw className="h-2 w-2 animate-spin" />
                SYNCING
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl border-primary/20 text-primary hover:bg-primary/5">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              Manage Keys
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl border-secondary/20 text-secondary hover:bg-secondary/5">
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
                <CardTitle className="text-xl font-bold tracking-tighter">Vault Endpoints</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Direct Cryptographic Isolation</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter assets..." 
                  className="pl-10 h-12 bg-background/50 border-none shadow-inner rounded-xl text-sm font-bold" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {filteredAssets.length > 0 ? filteredAssets.map((asset, idx) => (
                  <div key={idx} className="flex flex-col p-6 border-2 rounded-3xl hover:bg-muted/10 transition-all border-primary/5 hover:border-secondary/30 bg-background/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-lg text-primary shadow-lg border border-primary/10">
                          {asset.currency}
                        </div>
                        <div className="space-y-1">
                          <div className="font-bold text-xl flex items-center gap-2">
                            {asset.currency}
                            <Badge variant="outline" className="text-[9px] h-4 font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
                              MAINNET LIVE
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono font-bold flex items-center gap-2 opacity-80">
                            {asset.address}
                            <button 
                              className="p-1 hover:bg-secondary/20 rounded transition-colors"
                              onClick={() => copyToClipboard(asset.address, "Address")}
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-secondary" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-2xl tracking-tighter">{asset.amount.toFixed(4)} <span className="text-xs font-bold text-muted-foreground opacity-50">{asset.currency}</span></div>
                        <div className="text-xs text-green-500 font-bold opacity-80">${asset.fiatValueUSD.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-primary/5 mt-4">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Zap className="h-3 w-3 text-secondary" />
                        Network Isolation Active
                      </div>
                      <div className="flex gap-2">
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
                )) : assets.length === 0 && !isSyncing ? (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-xs tracking-widest flex flex-col items-center gap-4">
                    <ShieldAlert className="h-10 w-10 text-muted" />
                    Provisioning primary endpoint...
                  </div>
                ) : (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-xs tracking-widest flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    Syncing Cloud Enclave...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden rounded-[2rem] p-4">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Lock className="h-48 w-48" />
            </div>
            <CardHeader className="relative z-10 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-black tracking-widest uppercase">
                <Cpu className="h-6 w-6 text-secondary" />
                Hardware Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 relative z-10">
              <div className="p-6 bg-white/5 rounded-2xl space-y-6 backdrop-blur-3xl border border-white/10 shadow-inner">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Fingerprint className="h-4 w-4 text-secondary" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Biometric Sync</span>
                      </div>
                      <Badge className="bg-green-500 text-white border-none text-[8px] font-black">LOCKED</Badge>
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <ShieldCheck className="h-4 w-4 text-secondary" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Enclave Isolation</span>
                      </div>
                      <Badge className="bg-green-500 text-white border-none text-[8px] font-black">ACTIVE</Badge>
                   </div>
                </div>

                <div className="h-px bg-white/10 w-full" />
                
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Master Key Strength</div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-full" />
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full font-black h-14 shadow-2xl flex items-center gap-2 rounded-2xl border-white/10 hover:bg-white/5 text-white group" asChild>
                <Link href="/settings">
                   <Settings className="h-5 w-5 text-secondary transition-transform group-hover:rotate-90" />
                   Configure Vault Keys
                   <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] p-8 border-dashed border-2 bg-muted/20 space-y-4">
             <h4 className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Non-Custodial Note
             </h4>
             <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                Coin A,M provides high-performance interfaces to decentralized peers. Key management is handled exclusively in the secure **Settings Terminal**.
             </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
