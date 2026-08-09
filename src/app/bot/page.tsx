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
  Coins
} from 'lucide-react';
import { useVaultStore } from '@/lib/store';
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
      symbol: `BINANCE:${symbol}USDT`,
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
        className="tradingview-widget-container" 
        style={{ height: "500px", width: "100%", position: "absolute", top: 0, left: 0 }}
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
    botActive, 
    botAllocation, 
    botRiskLevel, 
    botStrategy,
    botLogs, 
    isAnalyzing,
    updateBotSettings,
    clearBotLogs
  } = useVaultStore();

  const [localAllocation, setLocalAllocation] = useState(botAllocation.toString());
  const [localRisk, setLocalRisk] = useState<'low' | 'medium' | 'high'>(botRiskLevel);
  const [localStrategy, setLocalStrategy] = useState<'standard' | 'bitcoin_multiplier'>(botStrategy);
  const [chartSymbol, setChartSymbol] = useState("BTC");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [botLogs]);

  useEffect(() => {
    setLocalAllocation(botAllocation.toString());
    setLocalRisk(botRiskLevel);
    setLocalStrategy(botStrategy);
  }, [botAllocation, botRiskLevel, botStrategy]);

  const handleToggleBot = () => {
    const allocationNum = parseFloat(localAllocation);
    if (isNaN(allocationNum) || allocationNum <= 0) {
      toast({
        title: "Configuration Error",
        description: "Please specify a valid trading allocation amount.",
        variant: "destructive"
      });
      return;
    }
    updateBotSettings(!botActive, allocationNum, localRisk, localStrategy);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Quantum Signal Agent
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {localStrategy === 'bitcoin_multiplier' ? 'Bitcoin Aggregator Active. Focusing on BTC Multipliers.' : 'AI Strategy Analysis Active. Monitoring Mainnet rebalancing opportunities.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            botActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", botActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Neural Link: {botActive ? 'LIVE' : 'STANDBY'}
          </Badge>
          <Button 
            onClick={handleToggleBot} 
            variant={botActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {botActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {botActive ? 'Disable Agent' : 'Launch AI Agent'}
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
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mainnet Analysis</p>
                  <p className="text-4xl font-black tracking-tighter text-green-600">{botActive ? 'SYNCING' : 'IDLE'}</p>
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
                Market Vision: {chartSymbol}/USDT
              </h3>
            </div>
            <BotTradingChart symbol={chartSymbol} />
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Neural Execution Feed</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary mr-4">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    ANALYZING MAINNET
                  </div>
                )}
                <Button variant="ghost" size="icon" onClick={clearBotLogs} className="h-8 w-8 text-white/30 hover:text-white">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-3 no-scrollbar max-h-[400px]">
              {botLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <BrainCircuit className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Strategic Signal</p>
                </div>
              ) : (
                botLogs.map((log, i) => (
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
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">AI Agent Core</Label>
                  <Select value={localStrategy} onValueChange={(v: any) => setLocalStrategy(v)} disabled={botActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Select Bot Strategy" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="standard">Mainnet Alpha (Standard)</SelectItem>
                      <SelectItem value="bitcoin_multiplier">Bitcoin Multiplier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Capital Allocation Cap (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      value={localAllocation}
                      onChange={(e) => setLocalAllocation(e.target.value)}
                      disabled={botActive}
                      className="pl-9 h-12 rounded-xl font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Tolerance Profile</Label>
                  <Select value={localRisk} onValueChange={(v: any) => setLocalRisk(v)} disabled={botActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Conservative (Delta Neutral)</SelectItem>
                      <SelectItem value="medium">Balanced (Standard AI)</SelectItem>
                      <SelectItem value="high">Aggressive Growth (Yield Focused)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-primary/10 w-full" />

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden">
                {localStrategy === 'bitcoin_multiplier' ? (
                  <Coins className={cn("absolute -right-6 -bottom-6 h-28 w-28 opacity-10 text-secondary transition-all", botActive && "animate-pulse")} />
                ) : (
                  <Rocket className={cn("absolute -right-6 -bottom-6 h-28 w-28 opacity-10 text-secondary transition-all", localRisk === 'high' && "animate-bounce")} />
                )}
                
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  {localStrategy === 'bitcoin_multiplier' ? 'Bitcoin Aggregator Rail' : (localRisk === 'high' ? 'High-Performance Rail' : 'Real-World Execution')}
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  {localStrategy === 'bitcoin_multiplier' 
                    ? "The Bitcoin Multiplier agent is optimized for BTC accumulation. It ignores secondary market signals to focus purely on growth." 
                    : (localRisk === 'high' 
                      ? "The AI Agent is optimized for high-conviction growth opportunities. Assets will be rebalanced more frequently based on market momentum." 
                      : "The AI Agent provides real-time strategy signals. Swaps and transfers are settled directly against the decentralized ledger.")
                  }
                </p>
              </div>

              {botActive && (
                <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">
                  {localStrategy === 'bitcoin_multiplier' ? 'BTC Multiplier active' : 'Signal Agent active'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}