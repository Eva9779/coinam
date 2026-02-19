
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  MoreVertical,
  Key,
  ShieldCheck
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
        title: "New Address Linked",
        description: `Successfully generated a new ${randomCurr} endpoint.`,
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
            Asset Vault
          </h2>
          <p className="text-muted-foreground">Secure key management and multi-currency balances.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 h-12">
          <Plus className="h-4 w-4" /> 
          {isGenerating ? "Linking..." : "Generate New Key"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Connected Wallets</CardTitle>
                <CardDescription>Verified addresses in your secure enclave.</CardDescription>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search assets..." 
                  className="pl-8" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssets.length > 0 ? filteredAssets.map((asset, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-semibold">{asset.currency}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          {asset.address}
                          <button onClick={() => {
                            navigator.clipboard.writeText(asset.address);
                            toast({ title: "Address copied" });
                          }}>
                            <Copy className="h-3 w-3 hover:text-secondary cursor-pointer" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-lg">{asset.amount.toFixed(4)} {asset.currency}</div>
                        <div className="text-xs text-muted-foreground">${asset.fiatValueUSD.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                    No matching assets found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-secondary" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Encryption</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">AES-256 Enabled</span>
                  <Badge className="bg-secondary text-white border-none">Secure</Badge>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/80 leading-relaxed">
                Your private keys never leave the secure enclave. All transactions are signed locally before broadcast.
              </p>
              <Button variant="secondary" className="w-full font-bold">Manage Recovery Phrase</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Wallet Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-sm items-start">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div>
                  <div className="font-medium">Node Synchronization</div>
                  <div className="text-xs text-muted-foreground">Up to date with Mainnet</div>
                </div>
              </div>
              <div className="flex gap-3 text-sm items-start">
                <div className="h-2 w-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                <div>
                  <div className="font-medium">Active Monitoring</div>
                  <div className="text-xs text-muted-foreground">AI Guard active for all transfers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
