'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  TrendingUp, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Loader2,
  Settings2,
  DollarSign,
  BarChart3,
  Trophy,
  Trash2,
  BrainCircuit,
  Cpu,
  Coins,
  ExternalLink,
  Target
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function TradingBotPage() {
  const db = useFirestore();
  const { 
    botActive, botAllocation, botRiskLevel, botStrategy, botLogs, updateBotSettings, clearBotLogs, totalBotEarnings, runBotCycle, isSyncing
  } = useWalletStore();

  const [cryptoAllocation, setCryptoAllocation] = useState(botAllocation?.toString() || "20");
  const [cryptoRisk, setCryptoRisk] = useState<'low' | 'medium' | 'high'>(botRiskLevel || 'medium');
  const [cryptoStrategy, setCryptoStrategy] = useState(botStrategy || 'standard');
  const [targetAsset, setTargetAsset] = useState<string>("ETH");

  // Sync targetAsset with Firestore
  useEffect(() => {
    if (!db) return;
    const docRef = doc(db, 'botState', 'ethUsdcBot');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.targetAsset) {
          setTargetAsset(data.targetAsset);
        }
      }
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
    return () => unsub();
  }, [db]);

  const handleTargetAssetChange = (val: string) => {
    setTargetAsset(val);
    if (db) {
      const docRef = doc(db, 'botState', 'ethUsdcBot');
      updateDoc(docRef, { targetAsset: val })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { targetAsset: val },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });
      toast({ title: `Strategy Switched to ${val}`, description: "Backend target updated successfully." });
    }
  };

  const handleToggleBot = () => {
      const alloc = parseFloat(cryptoAllocation);
      if (!botActive && (isNaN(alloc) || alloc < 20)) {
        toast({ title: "Min Allocation $20", variant: "destructive" });
        return;
      }
      updateBotSettings(!botActive, alloc, cryptoRisk, cryptoStrategy);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Strategy Agent
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Base Mainnet Enclave. Real-World Execution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {botActive && (
            <Button 
              onClick={runBotCycle} 
              disabled={isSyncing}
              variant="outline"
              className="h-12 px-6 rounded-2xl border-secondary/20 font-black gap-2"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-secondary" />}
              Manual Execution
            </Button>
          )}
          <Button 
            onClick={handleToggleBot} 
            variant={botActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {botActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {botActive ? 'Deactivate Agent' : 'Launch Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Mainnet Yield</p>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Strategy</p>
                  <p className="text-4xl font-black tracking-tighter text-blue-600">{targetAsset} / USDC</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border-blue-500/20">
                  <Activity className="h-7 w-7 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Real-Time Execution Logs</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={clearBotLogs} className="h-8 w-8 text-white/30 hover:text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-4 no-scrollbar">
              {botLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <BrainCircuit className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Strategic Entry</p>
                </div>
              ) : (
                botLogs.slice().reverse().map((log, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl border border-white/5 animate-in fade-in slide-in-from-left-4 duration-500",
                    log.type === 'success' ? "bg-green-500/5 text-green-400 border-green-500/10" : 
                    log.type === 'error' ? "bg-red-500/5 text-red-400 border-red-500/10" : "bg-white/5 text-blue-300"
                  )}>
                    <div className="flex justify-between items-center">
                       <span className="opacity-30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                       {log.hash && (
                         <a href={`https://basescan.org/tx/${log.hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-secondary hover:underline">
                           View Tx <ExternalLink className="h-2 w-2" />
                         </a>
                       )}
                    </div>
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
                  <Select value={targetAsset} onValueChange={handleTargetAssetChange} disabled={botActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-secondary" />
                        <SelectValue placeholder="Select Asset" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      <SelectItem value="ETH" className="font-bold">Ethereum (ETH)</SelectItem>
                      <SelectItem value="BTC" className="font-bold">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="SOL" className="font-bold">Solana (SOL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Allocation (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      placeholder="20" 
                      value={cryptoAllocation}
                      onChange={(e) => setCryptoAllocation(e.target.value)}
                      disabled={botActive}
                      className="pl-9 h-12 rounded-xl font-bold text-lg border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Strategy Protocol</Label>
                  <Select value={cryptoStrategy} onValueChange={setCryptoStrategy} disabled={botActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      <SelectItem value="standard" className="font-bold">Momentum Harvester</SelectItem>
                      <SelectItem value="bitcoin_multiplier" className="font-bold">Swing Accumulator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Profile</Label>
                  <Select 
                    value={cryptoRisk} 
                    onValueChange={(v: any) => setCryptoRisk(v)} 
                    disabled={botActive}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <SelectValue placeholder="Select Risk" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      <SelectItem value="low" className="font-bold">Conservative</SelectItem>
                      <SelectItem value="medium" className="font-bold">Balanced</SelectItem>
                      <SelectItem value="high" className="font-bold">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-primary/10 w-full" />

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden">
                <Zap className={cn("absolute -right-6 -bottom-6 h-28 w-28 opacity-10 text-secondary transition-all", botActive && "animate-pulse")} />
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  Proof of Backend
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  The bot executes real transactions on **Base Mainnet**. Every strategy action generates a verifiable transaction hash logged to your institutional ledger.
                </p>
              </div>

              {botActive && (
                <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">
                  Agent is active on {targetAsset} pool
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}