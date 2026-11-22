'use client';

import { useState, useEffect, useRef, memo } from 'react';
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
  RefreshCw,
  LineChart,
  Globe,
  Settings2,
  DollarSign,
  BarChart3,
  Eye,
  Trophy,
  Trash2,
  BrainCircuit,
  Rocket,
  Coins,
  Cpu,
  Wallet,
  AlertCircle,
  Landmark
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const BotTradingChart = memo(({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = ''; 
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    const config = {
      autosize: true,
      symbol: symbol === 'DERIV' ? 'INDEX:VOL100' : `NASDAQ:${symbol}`,
      interval: "1",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: "rgba(2, 6, 23, 1)",
      gridColor: "rgba(30, 41, 59, 0.5)",
      container_id: "bot_chart_inner",
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-[500px] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl bg-[#020617] relative">
      <div 
        id="bot_chart_inner"
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

BotTradingChart.displayName = "BotTradingChart";

export default function TradingBotPage() {
  const { 
    assets, 
    user, 
    totalBotEarnings, 
    stockBotActive, 
    stockBotAllocation, 
    stockBotRisk, 
    stockBotLogs, 
    isAnalyzingStocks,
    updateStockBotSettings,
    clearStockBotLogs
  } = useWalletStore();

  const [localAllocation, setLocalAllocation] = useState((stockBotAllocation || 20).toString());
  const [localRisk, setLocalRisk] = useState<'low' | 'medium' | 'high'>(stockBotRisk || 'medium');
  const [chartSymbol, setChartSymbol] = useState("NVDA");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stockBotLogs]);

  useEffect(() => {
    setLocalAllocation((stockBotAllocation || 20).toString());
    setLocalRisk(stockBotRisk || 'medium');
  }, [stockBotAllocation, stockBotRisk]);

  const handleToggleBot = () => {
    const allocationNum = parseFloat(localAllocation);
    if (isNaN(allocationNum) || allocationNum < 20) {
      toast({
        title: "Configuration Error",
        description: "Minimum micro-allocation for the RWA agent is $20 USD.",
        variant: "destructive"
      });
      return;
    }
    updateStockBotSettings(!stockBotActive, allocationNum, localRisk);
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
            RWA Earning Protocol. Optimized for $20+ starting balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            stockBotActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", stockBotActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Strategy Link: {stockBotActive ? 'LIVE' : 'STANDBY'}
          </Badge>
          <Button 
            onClick={handleToggleBot} 
            variant={stockBotActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {stockBotActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {stockBotActive ? 'Disable Agent' : 'Launch Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Captured Yield</p>
                  <p className="text-4xl font-black tracking-tighter">${totalBotEarnings.toFixed(4)}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Trophy className="h-7 w-7 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/10 shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Enclave Status</p>
                  <p className="text-4xl font-black tracking-tighter text-green-600">SECURE</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center border-green-500/20">
                  <Activity className="h-7 w-7 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-secondary" />
                Market Vision: {chartSymbol}/USD
              </h3>
              <Select value={chartSymbol} onValueChange={setChartSymbol}>
                <SelectTrigger className="w-40 h-10 rounded-xl font-bold bg-card border-none shadow-sm">
                  <SelectValue placeholder="Select Asset" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="NVDA">NVIDIA (NVDA)</SelectItem>
                  <SelectItem value="AAPL">Apple (AAPL)</SelectItem>
                  <SelectItem value="TSLA">Tesla (TSLA)</SelectItem>
                  <SelectItem value="TQQQ">TQQQ (3X Leveraged)</SelectItem>
                  <SelectItem value="SOXL">SOXL (3X Semi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <BotTradingChart symbol={chartSymbol} />
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Strategy Feed</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isAnalyzingStocks && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary mr-4">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    HARVESTING ALPHA
                  </div>
                )}
                <Button variant="ghost" size="icon" onClick={clearStockBotLogs} className="h-8 w-8 text-white/30 hover:text-white">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-3 no-scrollbar max-h-[400px]">
              {stockBotLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <BrainCircuit className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Strategic Signal</p>
                </div>
              ) : (
                stockBotLogs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-left-4 duration-500",
                    log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300"
                  )}>
                    <span className="opacity-30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="font-bold">{log.msg}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] shadow-xl border-primary/10 overflow-hidden bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-secondary" />
                Strategy Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Agent Profile</Label>
                  <div className="h-12 rounded-xl border bg-muted/20 flex items-center px-4 font-bold gap-2">
                    <Landmark className="h-4 w-4 text-secondary" />
                    Proactive Equity Harvester
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Allocation Cap (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      placeholder="20" 
                      value={localAllocation}
                      onChange={(e) => setLocalAllocation(e.target.value)}
                      disabled={stockBotActive}
                      className="pl-9 h-12 rounded-xl font-bold text-lg"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">* Min: $20.00 for modern network efficiency.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Profile</Label>
                  <Select value={localRisk} onValueChange={(v: any) => setLocalRisk(v)} disabled={stockBotActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Conservative (Bond Tokens)</SelectItem>
                      <SelectItem value="medium">Balanced (Equity Tokens)</SelectItem>
                      <SelectItem value="high">Aggressive (Growth Alpha)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-primary/10 w-full" />

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden">
                <Cpu className={cn("absolute -right-6 -bottom-6 h-28 w-28 opacity-10 text-secondary transition-all", stockBotActive && "animate-pulse")} />
                
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  No-Loss Harvest
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  The agent identifies dips in tech equities and buys spot fractional shares. It will strictly HOLD until a profit target is reached, ensuring no principal is lost.
                </p>
              </div>

              {stockBotActive && (
                <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">
                  Agent is active
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
