
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOCK_WALLET_BALANCES } from "@/lib/data";
import { 
  Plus, 
  Wallet, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  MoreVertical,
  Key
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export default function WalletPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAssets = MOCK_WALLET_BALANCES.filter(a => 
    a.currency.toLowerCase().includes(search.toLowerCase())
  );

  const generateWallet = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "New Wallet Generated",
        description: "A secure sub-wallet has been successfully added to your vault.",
      });
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Wallet Assets</h2>
          <p className="text-muted-foreground">Manage your cryptographic keys and multi-currency balances.</p>
        </div>
        <Button onClick={generateWallet} disabled={isGenerating} className="gap-2">
          <Plus className="h-4 w-4" /> 
          {isGenerating ? "Generating..." : "Generate New Key"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Connected Wallets</CardTitle>
                <CardDescription>Primary storage and cold-storage links.</CardDescription>
              </div>
              <div className="relative w-48">
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
                {filteredAssets.map((asset) => (
                  <div key={asset.currency} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {asset.currency}
                      </div>
                      <div>
                        <div className="font-semibold">{asset.currency}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          bc1q8h...v9f
                          <button onClick={() => {
                            navigator.clipboard.writeText("bc1q8h...v9f");
                            toast({ title: "Address copied" });
                          }}>
                            <Copy className="h-3 w-3 hover:text-secondary cursor-pointer" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-lg">{asset.amount} {asset.currency}</div>
                        <div className="text-xs text-muted-foreground">${asset.fiatValueUSD.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowUpRight className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowDownLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-secondary" />
                Security Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider">Storage Method</div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Hardware Linked</span>
                  <Badge className="bg-secondary text-white">Active</Badge>
                </div>
              </div>
              <div className="text-sm text-primary-foreground/80 leading-relaxed">
                Your private keys are encrypted with AES-256 and stored in the secure enclave of your device.
              </div>
              <Button variant="secondary" className="w-full">Export Private Key</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-sm items-start">
                <div className="h-2 w-2 rounded-full bg-secondary mt-1.5 shrink-0" />
                <div>
                  <div className="font-medium">Unusual transaction detected</div>
                  <div className="text-xs text-muted-foreground">0.1 BTC sent to unknown address</div>
                </div>
              </div>
              <div className="flex gap-3 text-sm items-start opacity-60">
                <div className="h-2 w-2 rounded-full bg-muted mt-1.5 shrink-0" />
                <div>
                  <div className="font-medium">New key generated</div>
                  <div className="text-xs text-muted-foreground">Successfully added ETH sub-wallet</div>
                </div>
              </div>
              <Button variant="link" className="w-full text-secondary text-xs" asChild>
                <a href="/alerts">View all smart insights</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
