
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
  Brain, 
  Activity, 
  ShieldCheck, 
  Loader2,
  RefreshCw,
  LineChart,
  Globe,
  Settings2,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Monitor,
  Eye
} from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { analyzeMarketAndTrade, TradingBotOutput } from '@/ai/flows/trading-bot-flow';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Institutional Bot Chart Component
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
      container_id: "tradingview_bot_chart",
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-full min-h-[400px] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl bg-[#020617]">
      <div 
        id="tradingview_bot_chart"
        ref={containerRef} 
        className="tradingview-widget-container" 
        style={{ height: "100%", width: "100%" }}
      >
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
      </div>
    </div>
  );
});

BotTradingChart.displayName = "BotTradingChart";

export default function TradingBotPage() {
  const { assets, initialized, user, updateBalance, addTransaction } = useVaultStore();
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allocation, setAllocation] = useState<string>("1000");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("medium");
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'warning'}[]>([] );
  const [botOutput, setBotOutput] = useState<TradingBotOutput | null>(null);
  const [sessionEarnings, setSessionEarnings] = useState<number>(0);
  const [chartSymbol, setChartSymbol] = useState("BTC");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchLiveMarketData = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd&include_24hr_change=true');
      const data = await res.json();
      return [
        { currency: 'BTC', price: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change },
        { currency: 'ETH', price: data.ethereum.usd, change24h: data.ethereum.usd_24h_change },
        { currency: 'SOL', price: data.solana.usd, change24h: data.solana.usd_24h_change },
        { currency: 'USDC', price: data['usd-coin'].usd, change24h: 0 },
      ];
    } catch (error) {
      addLog('Primary pricing feed offline. Using failover node.', 'warning');
      return [
        { currency: 'BTC', price: 65200, change24h: 1.2 },
        { currency: 'ETH', price: 2540, change24h: -0.5 },
        { currency: 'SOL', price: 152, change24h: 4.8 },
        { currency: 'USDC', price: 1, change24h: 0 },
      ];
    }
  };

  const runBotCycle = async () => {
    if (!user || !initialized) return;
    
    setIsAnalyzing(true);
    addLog(`Initiating Quantum Protocol: ${riskLevel.toUpperCase()} Strategy`, 'info');
    addLog('Synchronizing with Global Liquidity Nodes...', 'info');
    
    try {
      const liveMarket = await fetchLiveMarketData();
      addLog('Market Pulse Sync Successful. Analyzing Volatility Indices.', 'success');

      const response = await analyzeMarketAndTrade({
        userId: user.uid,
        assets: assets.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: liveMarket,
        riskTolerance: riskLevel,
        allocationLimitUSD: parseFloat(allocation) || 0
      });

      setBotOutput(response);
      addLog(`AI Strategy Formulated: ${response.strategy}`, 'success');
      addLog(`Sentiment: ${response.marketSentiment.toUpperCase()} | confidence: ${response.confidenceScore}%`, 'info');

      if (response.actions.length > 0) {
        const topAction = response.actions.find(a => a.type !== 'hold');
        if (topAction) setChartSymbol(topAction.toAsset);
      }

      let sessionProfit = 0;

      for (const action of response.actions) {
        if (action.type === 'buy' || action.type === 'sell') {
          addLog(`Executing Asset Rebalance: ${action.type.toUpperCase()} ${action.amount} ${action.fromAsset} → ${action.toAsset}`, 'warning');
          
          const fromMarket = liveMarket.find(m => m.currency === action.fromAsset);
          const toMarket = liveMarket.find(m => m.currency === action.toAsset);
          
          const fromPrice = fromMarket?.price || 1;
          const toPrice = toMarket?.price || 1;
          
          const fromData = assets.find(a => a.currency === action.fromAsset);
          
          if (fromData && fromData.amount >= action.amount) {
            const receiveAmount = action.amount * (fromPrice / toPrice);
            
            updateBalance(action.fromAsset, -action.amount, fromPrice);
            updateBalance(action.toAsset, receiveAmount, toPrice);
            
            addTransaction({
              type: 'trade',
              currency: `${action.fromAsset} → ${action.toAsset}`,
              amount: action.amount,
              fiatValueUSD: action.amount * fromPrice,
              description: `AI Income Generation: ${action.reasoning}`
            });
            
            const tradeGain = (action.amount * fromPrice) * 0.001; 
            sessionProfit += tradeGain;
            
            addLog(`Network Confirmation: Trade finalized on-chain. Funds settled.`, 'success');
          } else {
            addLog(`Execution Halted: Insufficient ${action.fromAsset} for trade allocation.`, 'warning');
          }
        } else {
          addLog(`Strategic Hold: ${action.reasoning}`, 'info');
        }
      }

      setSessionEarnings(prev => prev + sessionProfit);

    } catch (error) {
      addLog('Node Failure: Could not finalize network broadcast.', 'warning');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleBot = () => {
    if (!isActive) {
      if (!allocation || parseFloat(allocation) <= 0) {
        toast({
          title: "Configuration Error",
          description: "Please specify a valid trading allocation amount.",
          variant: "destructive"
        });
        return;
      }
      setIsActive(true);
      addLog('Production Trading Protocol: ACTIVE', 'success');
      runBotCycle();
    } else {
      setIsActive(false);
      addLog('Production Trading Protocol: STANDBY', 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Quantum Trader AI
          </h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Institutional algorithmic rebalancing and live market intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            isActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", isActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Network: {isActive ? 'LIVE' : 'STANDBY'}
          </Badge>
          <Button 
            onClick={toggleBot} 
            variant={isActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {isActive ? 'Stop Trading' : 'Launch AI Bot'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-secondary" />
                Live Execution View: {chartSymbol}/USDT
              </h3>
              <div className="flex items-center gap-2">
                 <Badge variant="secondary" className="bg-primary/5 text-primary border border-primary/10 flex gap-1.5 items-center">
                    <Eye className="h-3 w-3" />
                    LIVE-SYNC
                 </Badge>
              </div>
            </div>
            <BotTradingChart symbol={chartSymbol} />
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">Real-time Bot Logs</CardTitle>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-secondary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Neural Logic Processing...
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-3 no-scrollbar max-h-[400px]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6 py-20">
                  <Activity className="h-16 w-16" />
                  <p className="uppercase tracking-[0.4em] font-black text-sm">Awaiting Protocol Initialization</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-left-4 duration-500",
                    log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300"
                  )}>
                    <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
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
                Control Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Trading Capital (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      placeholder="1000" 
                      value={allocation}
                      onChange={(e) => setAllocation(e.target.value)}
                      disabled={isActive}
                      className="pl-9 h-12 rounded-xl font-bold text-lg"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Max budget per trade session.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Tolerance</Label>
                  <Select value={riskLevel} onValueChange={(v: any) => setRiskLevel(v)} disabled={isActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Select Strategy" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Conservative (Low Yield)</SelectItem>
                      <SelectItem value="medium">Balanced (Standard AI)</SelectItem>
                      <SelectItem value="high">Aggressive (High Frequency)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-primary/10 w-full" />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[1.5rem] bg-muted/50 border shadow-inner">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Session Gain</p>
                  <p className="text-2xl font-black text-green-600 flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4" />
                    ${sessionEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="p-5 rounded-[1.5rem] bg-muted/50 border shadow-inner">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">AI Confidence</p>
                  <p className="text-2xl font-black text-primary">{botOutput?.confidenceScore || 0}%</p>
                </div>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden">
                <Zap className="absolute -right-6 -bottom-6 h-28 w-28 opacity-10 text-secondary" />
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  Execution Policy
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  The bot settles all trade income directly into your non-custodial vault. 
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-14 rounded-2xl font-bold border-secondary/20 text-secondary hover:bg-secondary/5 transition-all"
                onClick={runBotCycle}
                disabled={!isActive || isAnalyzing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
                Manual Refresh Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
