'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  Play, 
  Pause, 
  Terminal, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Loader2,
  Settings2,
  Trophy,
  Trash2,
  BrainCircuit,
  PlusCircle,
  Copy,
  Wallet,
  Lock,
  AreaChart as ChartIcon,
  TrendingUp
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore, useUserHook } from '@/firebase';
import { BridgeToBaseButton } from '@/components/bot/bridge-to-base-button';
import { ethers } from 'ethers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export default function TradingBotPage() {
  const db = useFirestore();
  const { user } = useUserHook();
  const { 
    botLogs, clearBotLogs, totalBotEarnings, botConfig, updateBotSettings, initialized: storeInitialized,
    marketPulse
  } = useWalletStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [pin, setPin] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  const handleGenerateWallet = async () => {
    if (!user || !pin) return;
    if (pin.length < 6) {
      toast({ title: "Weak PIN", description: "Please use at least 6 characters for your security.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const wallet = ethers.Wallet.createRandom();
      const encryptedJson = await wallet.encrypt(pin);
      
      const botRef = doc(db, 'userBots', user.uid);
      await setDoc(botRef, {
        address: wallet.address,
        encryptedJson,
        isActive: false,
        targetAsset: "ETH",
        holding: "ASSET",
        createdAt: new Date().toISOString()
      });

      const assetRef = doc(db, 'users', user.uid, 'assets', 'primary_eth');
      await setDoc(assetRef, {
        id: 'primary_eth',
        currency: 'ETH',
        amount: 0,
        fiatValueUSD: 0,
        address: wallet.address,
        isLive: true,
        isPrimary: true
      });

      toast({ title: "Enclave Provisioned", description: "Your non-custodial vault is backed up and ready." });
      setShowPinDialog(false);
    } catch (e: any) {
      toast({ title: "Provisioning Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleBot = () => {
    if (!botConfig) return;
    const nextState = !botConfig.isActive;
    updateBotSettings({ isActive: nextState });
    toast({ title: nextState ? "Agent Launched" : "Agent Standby" });
  };

  if (!storeInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Vault...</p>
      </div>
    );
  }

  if (!botConfig) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 rounded-[2rem] bg-primary/5 flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
          <Bot className="h-12 w-12 text-primary opacity-40" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tighter">Initialize Secure Vault</h2>
          <p className="text-muted-foreground text-sm font-medium">To begin autonomous trading, you must provision a unique non-custodial endpoint with an encrypted cloud backup.</p>
        </div>
        <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl shadow-xl gap-3" onClick={() => setShowPinDialog(true)}>
          <PlusCircle className="h-6 w-6" />
          Generate Cloud Wallet
        </Button>

        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent className="rounded-[2rem] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <Lock className="h-6 w-6 text-secondary" />
                Set Vault PIN
              </DialogTitle>
              <DialogDescription>
                This PIN encrypts your wallet before it's backed up to Firestore. You will need it to sign transactions on any device.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Security PIN / Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-14 text-2xl tracking-widest text-center font-black rounded-xl border-2"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed bg-amber-500/5 p-4 rounded-xl border border-dashed border-amber-500/20">
                <strong>Important:</strong> We never see your PIN. If you lose it, you cannot recover your assets from the cloud backup.
              </p>
            </div>
            <DialogFooter>
              <Button className="w-full h-14 font-black rounded-xl text-lg shadow-xl" onClick={handleGenerateWallet} disabled={isGenerating || !pin}>
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                Authorize Encryption
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const currentPrice = marketPulse.crypto.find(c => c.ticker === botConfig.targetAsset)?.price || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Strategy Enclave
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Verified Endpoint: {botConfig.address.slice(0, 12)}...
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleToggleBot} 
            variant={botConfig.isActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {botConfig.isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {botConfig.isActive ? 'Deactivate Agent' : 'Launch Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Enclave Yield</p>
                  <p className="text-4xl font-black tracking-tighter">${totalBotEarnings.toFixed(2)}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Trophy className="h-7 w-7 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/10 shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Oracle Price ({botConfig.targetAsset})</p>
                  <p className="text-4xl font-black tracking-tighter text-blue-600">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border-blue-500/20">
                  <Activity className="h-7 w-7 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px]">
            <CardHeader className="border-b border-white/10 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChartIcon className="h-5 w-5 text-secondary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50">Market Intelligence</CardTitle>
                </div>
                <Badge variant="outline" className="text-[8px] border-secondary/30 text-secondary bg-secondary/5">LIVE ORACLE DATA</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px] w-full">
                <ChartContainer config={{ price: { label: "Price", color: "hsl(var(--secondary))" } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marketPulse.cryptoChartPoints}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="price" stroke="hsl(var(--secondary))" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Enclave Feed</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={clearBotLogs} className="h-8 w-8 text-white/30 hover:text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto p-8 font-mono text-xs space-y-4 no-scrollbar">
              {botLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <BrainCircuit className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Strategic Signal</p>
                </div>
              ) : (
                botLogs.slice().reverse().map((log, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl border border-white/5",
                    log.type === 'success' ? "text-green-400" : log.type === 'error' ? "text-red-400" : "text-blue-300"
                  )}>
                    <span className="opacity-30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="font-bold">{log.msg}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] shadow-xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-secondary" />
                Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Target Trading Asset</Label>
                  <Select value={botConfig.targetAsset} onValueChange={(v) => updateBotSettings({ targetAsset: v })} disabled={botConfig.isActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="SOL">Solana (SOL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3 relative overflow-hidden">
                   <div className="flex items-center justify-between relative z-10">
                      <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Vault Address</span>
                      <button className="hover:scale-110 transition-transform" onClick={() => { navigator.clipboard.writeText(botConfig.address); toast({ title: "Address Copied" }); }}>
                        <Copy className="h-3 w-3 text-secondary" />
                      </button>
                   </div>
                   <p className="text-[11px] font-mono break-all opacity-70 relative z-10">{botConfig.address}</p>
                   <Wallet className="absolute -right-4 -bottom-4 h-16 w-16 opacity-5 rotate-12" />
                </div>

                {user && <BridgeToBaseButton userId={user.uid} />}
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4">
                <h4 className="text-sm font-black flex items-center gap-2">
                  <Zap className="h-4 w-4 text-secondary" />
                  Cloud Backup Active
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  Your vault is protected by standard keystore encryption. You can recover this wallet on any device using your PIN.
                </p>
              </div>

              {botConfig.isActive && (
                <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">
                  Agent Monitoring Active
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
