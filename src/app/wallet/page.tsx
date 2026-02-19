
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
  ExternalLink,
  Database,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useVaultStore } from "@/lib/store";
import { getLiveBalance } from "@/lib/blockchain";

export default function WalletPage() {
  const { assets, generateNewWallet, initialized } = useVaultStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [syncingBalances, setSyncingBalances] = useState<Record<string, boolean>>({});

  const filteredAssets = assets.filter(a => 
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // In this setup, we prioritize ETH for live generation
      const currency = Math.random() > 0.5 ? 'ETH' : 'USDC';
      generateNewWallet(currency);
      setIsGenerating(true);
      setTimeout(() => setIsGenerating(false), 500);
      toast({
        title: "Key Provisioned on Mainnet",
        description: `Your new ${currency} endpoint is live and ready for peer sync.`,
      });
    }, 1500);
  };

  const handleSyncBalance = async (address: string, currency: string) => {
    if (currency !== 'ETH') return;
    setSyncingBalances(prev => ({ ...prev, [address]: true }));
    try {
      const liveBal = await getLiveBalance(address);
      toast({
        title: "Peer Sync Complete",
        description: `On-chain balance: ${liveBal} ETH`,
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
            Active Vault Enclave
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Verified multi-currency endpoints synchronized with Mainnet peers.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 h-14 px-8 shadow-2xl bg-primary hover:bg-primary/90 font-bold text-lg rounded-2xl">
          <Plus className="h-5 w-5" /> 
          {isGenerating ? "Signing..." : "Provision Mainnet Key"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-2xl border-none bg-card/50 backdrop-blur-lg">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tighter">Endpoints</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Provisioned on Peer Networks</CardDescription>
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
                          <Badge variant="outline" className={cn(
                            "text-[9px] h-4 font-bold uppercase tracking-widest",
                            asset.isLive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          )}>
                            {asset.isLive ? "MAINNET" : "ENCLAVE"}
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
                        {asset.isLive && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-secondary/10"
                            onClick={() => handleSyncBalance(asset.address, asset.currency)}
                            disabled={syncingBalances[asset.address]}
                          >
                            <RefreshCw className={cn("h-4 w-4 text-secondary", syncingBalances[asset.address] && "animate-spin")} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-xs tracking-widest">
                    No active assets found
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
                Network Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-5 bg-white/10 rounded-2xl space-y-4 backdrop-blur-xl border border-white/20 shadow-inner">
                <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Node Encryption Layer</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">ENCLAVE-V4-SECURE</span>
                  <Badge className="bg-green-500 text-white border-none text-[10px] font-bold">LATEST</Badge>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-full animate-pulse" />
                </div>
              </div>
              <p className="text-xs text-primary-foreground/70 leading-relaxed font-medium italic">
                "Signing material is derived via hardware-based TRNG. Private keys remain non-extractable, isolated from the network stack for maximum security."
              </p>
              <Button variant="secondary" className="w-full font-bold h-12 shadow-2xl flex items-center gap-2 rounded-xl text-primary">
                <Key className="h-4 w-4" />
                Master Recovery Audit
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-lg rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                Mainnet Pulse
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-4 text-sm items-start p-2 hover:bg-muted/30 rounded-xl transition-colors group">
                <div className="p-2.5 bg-secondary/10 rounded-xl shrink-0 group-hover:bg-secondary/20 transition-colors">
                  <ShieldCheck className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <div className="font-bold text-sm">Real-time Guard</div>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight opacity-70">AI heuristic broadcast analysis</div>
                </div>
              </div>
              <div className="flex gap-4 text-sm items-start p-2 hover:bg-muted/30 rounded-xl transition-colors group">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-sm">Peer Propagation</div>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight opacity-70">Distributed Ledger Connectivity</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
