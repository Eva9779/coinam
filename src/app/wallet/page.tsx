"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Copy, 
  MoreVertical,
  Key,
  ShieldCheck,
  Cpu,
  Lock,
  RefreshCw,
  CreditCard
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useVaultStore } from "@/lib/store";
import { getLiveBalance } from "@/lib/blockchain";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WalletPage() {
  const { assets, generateNewWallet, initialized } = useVaultStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [syncingBalances, setSyncingBalances] = useState<Record<string, boolean>>({});

  const filteredAssets = assets.filter(a => 
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    const currency = 'ETH';
    generateNewWallet(currency);
    setIsGenerating(false);
    toast({
      title: "Key Provisioned",
      description: `${currency} endpoint is now live on mainnet.`,
    });
  };

  const handleSyncBalance = async (address: string, currency: string) => {
    setSyncingBalances(prev => ({ ...prev, [address]: true }));
    try {
      const liveBal = await getLiveBalance(address);
      toast({
        title: "Network Sync Complete",
        description: `On-chain balance: ${liveBal} ${currency}`,
      });
    } catch (e) {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncingBalances(prev => ({ ...prev, [address]: false }));
    }
  };

  if (!initialized) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Active Vault
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Verified multi-currency endpoints synchronized with Mainnet peers.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl border-secondary/20 text-secondary hover:bg-secondary/5">
            <Link href="/buy">
              <CreditCard className="h-5 w-5" />
              Buy Crypto
            </Link>
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 h-14 px-8 shadow-2xl bg-primary hover:bg-primary/90 font-bold rounded-2xl">
            <Plus className="h-5 w-5" /> 
            {isGenerating ? "Authorizing..." : "Provision Key"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-2xl border-none bg-card/50 backdrop-blur-lg">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tighter">Endpoints</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Direct Ledger Connectivity</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search assets..." 
                  className="pl-10 h-11 bg-background/50 border-none shadow-inner rounded-xl text-sm" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssets.length > 0 ? filteredAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 border-2 rounded-3xl hover:bg-muted/20 transition-all group border-primary/5 hover:border-secondary/30 bg-background/30">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-lg text-primary shadow-lg border border-primary/10">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-bold text-xl flex items-center gap-2">
                          {asset.currency}
                          <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
                            MAINNET
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono font-bold flex items-center gap-2 mt-1 opacity-80">
                          {asset.address.slice(0, 10)}...{asset.address.slice(-6)}
                          <button 
                            className="p-1 hover:bg-secondary/20 rounded transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(asset.address);
                              toast({ title: "Address copied" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-secondary" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-10">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-2xl tracking-tighter">{asset.amount.toFixed(4)} <span className="text-xs font-bold text-muted-foreground opacity-50">{asset.currency}</span></div>
                        <div className="text-xs text-green-500 font-bold opacity-80">${asset.fiatValueUSD.toLocaleString()}</div>
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
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-xs tracking-widest">
                    Provision a mainnet key to start
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground border-none shadow-2xl relative overflow-hidden rounded-3xl p-2">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Lock className="h-32 w-32" />
            </div>
            <CardHeader className="relative z-10 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold tracking-tight">
                <Cpu className="h-6 w-6 text-secondary" />
                Vault Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-5 bg-white/10 rounded-2xl space-y-4 backdrop-blur-xl border border-white/20 shadow-inner">
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Network Encryption Layer</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">VAULT-SECURE-V4</span>
                  <Badge className="bg-green-500 text-white border-none text-[10px] font-bold">ACTIVE</Badge>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-full" />
                </div>
              </div>
              <p className="text-xs text-primary-foreground/70 leading-relaxed font-medium italic">
                "Direct cryptographic signing via hardware isolation. Private material remains non-extractable from the vault enclave."
              </p>
              <Button variant="secondary" className="w-full font-bold h-12 shadow-2xl flex items-center gap-2 rounded-xl text-primary" asChild>
                <Link href="/buy">
                   <CreditCard className="h-4 w-4" />
                   Fund Wallet
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
