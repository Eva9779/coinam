'use client';

import { useState, useEffect } from 'react';
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
  Cpu,
  Target,
  PlusCircle,
  Copy,
  Wallet
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirestore, useUserHook } from '@/firebase';

export default function TradingBotPage() {
  const db = useFirestore();
  const { user } = useUserHook();
  const { 
    botLogs, clearBotLogs, totalBotEarnings
  } = useWalletStore();

  const [botConfig, setBotConfig] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Sync Personal Bot Config from userBots collection
  useEffect(() => {
    if (!db || !user) return;
    const docRef = doc(db, 'userBots', user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setBotConfig(snap.data());
      }
      setLoadingConfig(false);
    });
    return () => unsub();
  }, [db, user]);

  const handleGenerateWallet = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.address) {
        toast({ title: "Bot Wallet Provisioned", description: "Your non-custodial trading endpoint is ready." });
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast({ title: "Provisioning Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleBot = () => {
    if (!db || !user || !botConfig) return;
    const docRef = doc(db, 'userBots', user.uid);
    const nextState = !botConfig.isActive;
    updateDoc(docRef, { isActive: nextState });
    toast({ title: nextState ? "Agent Launched" : "Agent Standby" });
  };

  const handleTargetChange = (val: string) => {
    if (!db || !user) return;
    const docRef = doc(db, 'userBots', user.uid);
    updateDoc(docRef, { targetAsset: val });
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Enclave...</p>
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
          <h2 className="text-3xl font-black tracking-tighter">Initialize Strategy Agent</h2>
          <p className="text-muted-foreground text-sm font-medium">To begin autonomous trading, you must provision a unique non-custodial endpoint for your account.</p>
        </div>
        <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl shadow-xl gap-3" onClick={handleGenerateWallet} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6" />}
          Generate Trading Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Personal Strategy Agent
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Enclave Verified: {botConfig.address.slice(0, 10)}...
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
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bot Holding</p>
                  <p className="text-4xl font-black tracking-tighter text-blue-600">{botConfig.holding === 'ASSET' ? botConfig.targetAsset : 'USDC'}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border-blue-500/20">
                  <Activity className="h-7 w-7 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Enclave Feed</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={clearBotLogs} className="h-8 w-8 text-white/30 hover:text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-4 no-scrollbar">
              {botLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <BrainCircuit className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Entry Signal</p>
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
                Bot Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Target Trading Asset</Label>
                  <Select value={botConfig.targetAsset} onValueChange={handleTargetChange} disabled={botConfig.isActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-secondary" />
                        <SelectValue />
                      </div>
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
                      <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Enclave Address</span>
                      <button className="hover:scale-110 transition-transform" onClick={() => { navigator.clipboard.writeText(botConfig.address); toast({ title: "Address Copied" }); }}>
                        <Copy className="h-3 w-3 text-secondary" />
                      </button>
                   </div>
                   <p className="text-[11px] font-mono break-all opacity-70 relative z-10">{botConfig.address}</p>
                   <Wallet className="absolute -right-4 -bottom-4 h-16 w-16 opacity-5 rotate-12" />
                </div>

                <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl">
                  <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                    To start, deposit at least 0.01 ETH or 20 USDC to your Enclave Address above on Base Mainnet.
                  </p>
                </div>
              </div>

              <div className="h-px bg-primary/10 w-full" />

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4">
                <h4 className="text-sm font-black flex items-center gap-2">
                  <Zap className="h-4 w-4 text-secondary" />
                  Execution Policy
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  The bot executes trades automatically when your chosen asset moves ±2.5% from your baseline. This is a non-custodial architecture powered by your master secret.
                </p>
              </div>

              {botConfig.isActive && (
                <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">
                  Agent monitoring active 24/7
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}