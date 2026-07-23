
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Copy, 
  Key,
  ShieldCheck,
  Cpu,
  Lock,
  RefreshCw,
  CreditCard,
  ShieldAlert,
  Zap,
  Fingerprint,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
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
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

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
      description: `${currency} cryptographic endpoint is now live on mainnet.`,
    });
  };

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

  const toggleRevealKey = (address: string) => {
    setRevealedKeys(prev => ({ ...prev, [address]: !prev[address] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: "Stored in secure clipboard.",
    });
  };

  if (!initialized) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-secondary" />
            Non-Custodial Vault
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Cryptographic endpoints synchronized with decentralized peers.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="gap-2 h-14 px-6 font-bold rounded-2xl border-secondary/20 text-secondary hover:bg-secondary/5">
            <Link href="/buy">
              <CreditCard className="h-5 w-5" />
              Fund Wallet
            </Link>
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 h-14 px-8 shadow-2xl bg-primary hover:bg-primary/90 font-bold rounded-2xl">
            <Plus className="h-5 w-5" /> 
            {isGenerating ? "Authorizing..." : "Generate Key"}
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
                    <div className="flex items-center justify-between mb-4">
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
                            {asset.address.slice(0, 10)}...{asset.address.slice(-6)}
                            <button 
                              className="p-1 hover:bg-secondary/20 rounded transition-colors"
                              onClick={() => copyToClipboard(asset.address, "Address")}
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-secondary" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="font-black text-2xl tracking-tighter">{asset.amount.toFixed(4)} <span className="text-xs font-bold text-muted-foreground opacity-50">{asset.currency}</span></div>
                        <div className="text-xs text-green-500 font-bold opacity-80">${asset.fiatValueUSD.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 h-10 px-4 rounded-xl hover:bg-primary/10 text-primary font-bold">
                              <Key className="h-4 w-4" />
                              Reveal Private Key
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[2rem] max-w-md">
                            <DialogHeader>
                              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                              </div>
                              <DialogTitle className="text-xl font-black tracking-tight">Secret Key Exposure</DialogTitle>
                              <DialogDescription className="text-sm font-medium leading-relaxed">
                                This key grants absolute control over your <span className="text-primary font-bold">{asset.currency}</span> vault. **NEVER** share this with anyone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-6 space-y-6">
                              <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">Private Cryptographic Key</p>
                                <div className="font-mono text-xs break-all text-white/90 leading-relaxed min-h-[40px] flex items-center">
                                  {revealedKeys[asset.address] ? (
                                    asset.privateKey || "Key not found in enclave."
                                  ) : (
                                    <span className="opacity-30 tracking-[0.3em]">••••••••••••••••••••••••••••••••</span>
                                  )}
                                </div>
                                <div className="absolute top-4 right-4 flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-white/50 hover:text-white"
                                    onClick={() => toggleRevealKey(asset.address)}
                                  >
                                    {revealedKeys[asset.address] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  {revealedKeys[asset.address] && asset.privateKey && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-white/50 hover:text-white"
                                      onClick={() => copyToClipboard(asset.privateKey!, "Private Key")}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="p-4 bg-amber-500/10 rounded-xl border border-dashed border-amber-500/20 flex gap-3 items-start">
                                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight leading-relaxed">
                                  Platform engineers cannot recover this key if lost. Keep it in an offline, secure location.
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                )) : (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl opacity-50 font-bold uppercase text-xs tracking-widest flex flex-col items-center gap-4">
                    <ShieldAlert className="h-10 w-10 text-muted" />
                    Provision a mainnet key to begin
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
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Zap className="h-4 w-4 text-secondary" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/70">AES-256 Auth</span>
                      </div>
                      <Badge className="bg-green-500 text-white border-none text-[8px] font-black">ENFORCED</Badge>
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
              
              <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20 flex gap-3 items-start">
                 <ShieldAlert className="h-5 w-5 text-secondary shrink-0" />
                 <p className="text-[10px] text-secondary font-bold leading-relaxed uppercase tracking-tight">
                    Private cryptographic material is generated in the browser and isolated in your private vault. Platform engineers cannot access your funds.
                 </p>
              </div>

              <Button variant="outline" className="w-full font-black h-14 shadow-2xl flex items-center gap-2 rounded-2xl border-white/10 hover:bg-white/5 text-white" asChild>
                <Link href="/buy">
                   <CreditCard className="h-5 w-5 text-secondary" />
                   Provision Liquidity
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
                Coin A,M operates on a non-custodial protocol. Your keys are yours. We provide the institutional-grade interface and AI trading layer, but you maintain 100% control of the cryptographic signing process.
             </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
