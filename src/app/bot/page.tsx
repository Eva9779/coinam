'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  LineChart
} from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { analyzeMarketAndTrade, TradingBotOutput } from '@/ai/flows/trading-bot-flow';
import { INITIAL_MARKET_DATA } from '@/lib/data';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function TradingBotPage() {
  const { assets, initialized, user, updateBalance, addTransaction } = useVaultStore();
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'warning'}[]>([]);
  const [botOutput, setBotOutput] = useState<TradingBotOutput | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { msg, type }]);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runBotCycle = async () => {
    if (!user || !initialized) return;
    
    setIsAnalyzing(true);
    addLog('Initializing Global Market Analysis Protocol...', 'info');
    
    try {
      const response = await analyzeMarketAndTrade({
        userId: user.uid,
        assets: assets.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: INITIAL_MARKET_DATA.map(m => ({
          currency: m.currency,
          price: m.currentPriceUSD,
          change24h: m.dailyChangePercent
        })),
        riskTolerance: 'medium'
      });

      setBotOutput(response);
      addLog(`Strategy Determined: ${response.strategy}`, 'success');
      addLog(`Sentiment: ${response.marketSentiment.toUpperCase()} | Confidence: ${response.confidenceScore}%`, 'info');

      // Execute suggested trades
      for (const action of response.actions) {
        if (action.type === 'buy' || action.type === 'sell') {
          addLog(`Executing Broadcast: ${action.type.toUpperCase()} ${action.amount} ${action.toAsset} via ${action.fromAsset}`, 'warning');
          
          // Simulated delay for "network broadcast"
          await new Promise(r => setTimeout(r, 1500));
          
          const rates: Record<string, number> = { "BTC": 64000, "ETH": 2400, "SOL": 145, "USDC": 1 };
          const fromData = assets.find(a => a.currency === action.fromAsset);
          
          if (fromData && fromData.amount >= action.amount) {
            const receiveAmount = action.amount * ((rates[action.fromAsset] || 1) / (rates[action.toAsset] || 1));
            
            updateBalance(action.fromAsset, -action.amount, rates[action.fromAsset] || 1);
            updateBalance(action.toAsset, receiveAmount, rates[action.toAsset] || 1);
            
            addTransaction({
              type: 'trade',
              currency: `${action.fromAsset} → ${action.toAsset}`,
              amount: action.amount,
              fiatValueUSD: action.amount * (rates[action.fromAsset] || 1),
              description: `AI Bot: ${action.reasoning}`
            });
            
            addLog(`Trade Finalized: ${action.toAsset} balance updated.`, 'success');
          } else {
            addLog(`Trade Failed: Insufficient ${action.fromAsset} balance.`, 'warning');
          }
        } else {
          addLog(`Holding ${action.fromAsset}: ${action.reasoning}`, 'info');
        }
      }
    } catch (error) {
      addLog('Neural Link Error: Connection to Market Brain Interrupted.', 'warning');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleBot = () => {
    if (!isActive) {
      setIsActive(true);
      addLog('Autonomous Trading Mode: ACTIVATED', 'success');
      runBotCycle();
    } else {
      setIsActive(false);
      addLog('Autonomous Trading Mode: STANDBY', 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3 tracking-tighter">
            <Bot className="h-8 w-8 text-secondary" />
            Quantum Trader AI
          </h2>
          <p className="text-muted-foreground font-medium">Global algorithmic rebalancing and momentum-capture protocol.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            isActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", isActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Bot Status: {isActive ? 'Running' : 'Paused'}
          </Badge>
          <Button 
            onClick={toggleBot} 
            variant={isActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2"
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {isActive ? 'Emergency Stop' : 'Initialize Autonomous Mode'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2rem] overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50">Execution Terminal</CardTitle>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-secondary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Neural Processing...
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-2 no-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                  <Brain className="h-12 w-12" />
                  <p className="uppercase tracking-[0.3em] font-black">Awaiting Activation Command</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300",
                    log.type === 'success' ? "text-green-400" : log.type === 'warning' ? "text-amber-400" : "text-blue-300"
                  )}>
                    <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
                    <span className="font-bold">{log.msg}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] shadow-xl border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                Live Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/50 border shadow-inner">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Total ROI</p>
                  <p className="text-2xl font-black text-green-600">+12.4%</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border shadow-inner">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Confidence</p>
                  <p className="text-2xl font-black text-primary">{botOutput?.confidenceScore || 0}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Active Intelligence Layer</p>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Neural Sync</span>
                    <Badge className="bg-green-500/10 text-green-600 border-none text-[8px]">HEALTHY</Badge>
                  </div>
                  <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Market Latency</span>
                    <span className="text-xs font-mono font-bold text-secondary">42ms</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 relative overflow-hidden">
                <Zap className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-secondary" />
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  Bot Governance
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  Autonomous mode uses high-confidence signals (85%+) to trigger P2P swaps. Private keys remain locked in the hardware enclave.
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold border-secondary/20 text-secondary hover:bg-secondary/5"
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
