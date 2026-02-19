
"use client";

import { useState } from "react";
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
  ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useVaultStore } from "@/lib/store";

export default function WalletPage() {
  const { assets, generateNewWallet, initialized } = useVaultStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAssets = assets.filter(a => 
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const currencies = ["BTC", "ETH", "SOL", "USDC"];
      const randomCurr = currencies[Math.floor(Math.random() * currencies.length)];
      generateNewWallet(randomCurr);
      setIsGenerating(false);
      toast({
        title: "Mainnet Endpoint Generated",
        description: `Linked a new ${randomCurr} address to your vault.`,
      });
    }, 1500);
  };

  if (!initialized) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Mainnet Vault
          </h2>
          <p className="text-muted-foreground">Secure multi-currency management via distributed enclaves.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 h-12 px-6 shadow-lg bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> 
          {isGenerating ? "Broadcasting..." : "Provision New Key"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-primary/5">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Provisioned Addresses</CardTitle>
                <CardDescription>Verified endpoints in your secure vault enclave.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter assets..." 
                  className="pl-8 h-10" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssets.length > 0 ? filteredAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-2xl hover:bg-muted/20 transition-all group border-primary/5 hover:border-secondary/30">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-bold text-primary shadow-inner">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          {asset.currency}
                          <Badge variant="outline" className="text-[9px] h-4 bg-blue-500/10 text-blue-600 border-blue-500/20">ENCLAVE</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                          {asset.address}
                          <button 
                            className="p-1 hover:bg-secondary/10 rounded transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(asset.address);
                              toast({ title: "Address copied" });
                            }}
                          >
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-secondary" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-xl">{asset.amount.toFixed(4)} <span className="text-xs font-normal text-muted-foreground">{asset.currency}</span></div>
                        <div className="text-xs text-green-500 font-medium">${asset.fiatValueUSD.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
                    No active assets found in filter.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-none shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lock className="h-32 w-32" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="h-5 w-5 text-secondary" />
                Hardware Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-4 bg-white/10 rounded-xl space-y-3 backdrop-blur-sm border border-white/10">
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Protocol Version</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">V3-ENCLAVE-LIVE</span>
                  <Badge className="bg-green-500 text-white border-none text-[10px]">ACTIVE</Badge>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-full" />
                </div>
              </div>
              <p className="text-xs text-primary-foreground/70 leading-relaxed italic">
                "Keys are generated using a hardware-based TRNG and signed within isolated execution environments. Private material is never exposed to the network layer."
              </p>
              <Button variant="secondary" className="w-full font-bold h-11 shadow-lg flex items-center gap-2">
                <Key className="h-4 w-4" />
                Audit Recovery Phrase
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Network Status
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-sm items-start">
                <div className="p-2 bg-muted rounded-lg shrink-0">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <div className="font-bold">Real-time Guard</div>
                  <div className="text-[11px] text-muted-foreground">AI heuristics scanning transactions</div>
                </div>
              </div>
              <div className="flex gap-3 text-sm items-start">
                <div className="p-2 bg-muted rounded-lg shrink-0">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-bold">Mainnet Peer Sync</div>
                  <div className="text-[11px] text-muted-foreground">Block height: 19,283,742</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
