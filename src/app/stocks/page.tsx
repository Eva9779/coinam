'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Briefcase, 
  Play, 
  Pause, 
  Terminal, 
  Activity, 
  ShieldCheck, 
  Loader2,
  Settings2,
  BarChart3,
  Landmark,
  Globe,
  Trash2,
  Trophy,
  Layers,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Cpu,
  Banknote,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  AreaChart as ChartIcon,
  Clock
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export default function StocksPage() {
  const { 
    stockAssets = [], 
    stockBotActive, 
    stockBotRisk, 
    stockBotAllocation,
    stockBotLogs = [], 
    harvestedStockYield,
    isAnalyzingStocks,
    updateStockBotSettings,
    clearStockBotLogs,
    liquidateEarnings,
    marketPulse
  } = useWalletStore();

  const [localRisk, setLocalRisk] = useState<'low' | 'medium' | 'high'>(stockBotRisk || 'medium');
  const [localAllocation, setLocalAllocation] = useState(stockBotAllocation?.toString() || "20");
  const [selectedAssetTicker, setSelectedAssetTicker] = useState("NVDA");
  const [isLiquidating, setIsLiquidating] = useState(false);

  useEffect(() => {
    if (stockBotAllocation) setLocalAllocation(stockBotAllocation.toString());
    if (stockBotRisk) setLocalRisk(stockBotRisk);
  }, [stockBotAllocation, stockBotRisk]);

  const handleToggleBot = () => {
    const allocationNum = parseFloat(localAllocation);
    if (isNaN(allocationNum) || allocationNum < 20) {
      toast({
        title: "Micro-Allocation Error",
        description: "Please specify an equity allocation of at least $20 USD.",
        variant: "destructive"
      });
      return;
    }
    updateStockBotSettings(!stockBotActive, allocationNum, localRisk);
    toast({ title: !stockBotActive ? "Agent Launched" : "Agent Standby" });
  };

  const handleLiquidate = async () => {
    setIsLiquidating(true);
    await liquidateEarnings();
    setIsLiquidating(false);
    toast({ title: "Yield Settled", description: "Profit moved to USDC vault." });
  };

  const totalValue = stockAssets.reduce((acc, s) => acc + s.totalValue, 0);

  const activeChartData = useMemo(() => {
    const asset = marketPulse.rwa.find(a => a.ticker === selectedAssetTicker);
    return asset?.chartPoints || [];
  }, [marketPulse.rwa, selectedAssetTicker]);

  const currentAssetPrice = useMemo(() => {
    const asset = marketPulse.rwa.find(a => a.ticker === selectedAssetTicker);
    return asset?.price || 0;
  }, [marketPulse.rwa, selectedAssetTicker]);

  const getActionStyle = (action?: string) => {
    const a = action?.toUpperCase() || "";
    if (a.includes("BUY")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (a.includes("HARVEST")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (a.includes("SCANNING")) return "bg-white/5 text-white/40 border-white/10";
    return "bg-white/5 text-white/60 border-white/10";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Landmark className="h-8 w-8 text-secondary" />
            RWA Strategy Agent
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Target: +2.1% Profit Harvesting. Institutional Enclave active.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {harvestedStockYield > 0 && (
             <Button 
              variant="outline" 
              className="h-12 px-6 rounded-2xl border-secondary/30 text-secondary hover:bg-secondary/5 font-bold shadow-sm"
              onClick={handleLiquidate}
              disabled={isLiquidating}
            >
              {isLiquidating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Settle Profit
            </Button>
          )}
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            stockBotActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", stockBotActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Protocol: {stockBotActive ? 'ACTIVE (+2.1%)' : 'STANDBY'}
          </Badge>
          <Button 
            onClick={handleToggleBot} 
            variant={stockBotActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {stockBotActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {stockBotActive ? 'Deactivate Agent' : 'Launch Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Harvested Yield</p>
                  <p className="text-3xl font-black tracking-tighter">
                    ${harvestedStockYield.toFixed(2)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Trophy className="h-6 w-6 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/10 shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Equity Vault</p>
                  <p className="text-3xl font-black tracking-tighter text-primary">
                    ${totalValue.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center border-secondary/20">
                  <Layers className="h-6 w-6 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/10 shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Oracle Price ({selectedAssetTicker})</p>
                  <p className="text-3xl font-black tracking-tighter text-green-600">
                    ${currentAssetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center border-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[500px]">
            <CardHeader className="border-b border-white/10 px-8 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ChartIcon className="h-5 w-5 text-secondary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Equity Vision: {selectedAssetTicker}</CardTitle>
                </div>
                <Select value={selectedAssetTicker} onValueChange={setSelectedAssetTicker}>
                  <SelectTrigger className="w-56 h-10 rounded-xl font-bold bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-white">
                    {marketPulse.rwa.map(asset => (
                      <SelectItem key={asset.ticker} value={asset.ticker} className="font-bold">{asset.symbol} ({asset.ticker})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-8">
               <div className="h-[350px] w-full">
                <ChartContainer config={{ price: { label: "Price", color: "hsl(var(--secondary))" } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeChartData}>
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
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Live AI Execution Logs</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {stockBotActive && (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 animate-pulse gap-1.5 px-2 py-0.5 font-black text-[9px] uppercase">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    LIVE TELEMETRY
                  </Badge>
                )}
                <button onClick={clearStockBotLogs} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[450px] overflow-y-auto p-8 font-mono text-xs space-y-4 no-scrollbar">
              {stockBotLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <Activity className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-xs text-center max-w-xs">Agent idle — toggle the AI Bot ON to begin real-time market scanning.</p>
                </div>
              ) : (
                stockBotLogs.slice().reverse().map((log: any, i) => (
                  <div key={i} className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="opacity-30 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5", getActionStyle(log.action || log.msg))}>
                          {log.action || (log.msg.includes("SCANNING") ? "SCANNING" : log.msg.includes("BUY") ? "BUY" : "INFO")}
                        </Badge>
                      </div>
                      {log.txHash && (
                        <a 
                          href={`https://basescan.org/tx/${log.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] font-black text-secondary hover:underline flex items-center gap-1"
                        >
                          View Receipt <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-bold text-white/90">{log.msg || `Autonomous rebalance for ${log.symbol}`}</p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {log.price && <span>Price: ${Number(log.price).toLocaleString()}</span>}
                        {log.profitUsd > 0 && <span className="text-green-400">Profit: +${log.profitUsd.toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] shadow-xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                <Settings2 className="h-5 w-5 text-secondary" />
                Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Allocation (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      placeholder="20" 
                      value={localAllocation}
                      onChange={(e) => setLocalAllocation(e.target.value)}
                      disabled={stockBotActive}
                      className="pl-9 h-12 rounded-xl font-bold text-lg border-2"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">* Strategy Optimized: Minimum $20.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Profile</Label>
                  <Select value={localRisk} onValueChange={(v: any) => setLocalRisk(v)} disabled={stockBotActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                      <SelectValue placeholder="Select Risk" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Conservative (Bond Tokens)</SelectItem>
                      <SelectItem value="medium">Balanced (Equity Tokens)</SelectItem>
                      <SelectItem value="high">Aggressive (Growth Alpha)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4 border border-white/5 relative overflow-hidden">
                <Zap className="absolute -right-4 -bottom-4 h-20 w-20 text-secondary opacity-10" />
                <h4 className="text-sm font-black flex items-center gap-2 text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                  +2.1% Harvest Protocol
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium relative z-10">
                  The RWA agent harvests profit mathematically when the **+2.1% target** is achieved against your baseline. Assets remain locked in the enclave until target hit.
                </p>
              </div>

              <div className="pt-4">
                <Button className="w-full h-14 rounded-2xl font-black gap-2 shadow-xl hover:scale-[1.02] transition-transform" asChild>
                  <Link href="/withdraw">
                    <Banknote className="h-5 w-5" />
                    Withdraw to Bank
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
