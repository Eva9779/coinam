
'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Target,
  Trophy,
  Layers,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const EquityChart = memo(({ symbol }: { symbol: string }) => {
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
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      backgroundColor: "rgba(2, 6, 23, 1)",
      gridColor: "rgba(30, 41, 59, 0.5)",
      container_id: "equity_chart_inner",
    };
    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-[500px] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl bg-[#020617] relative">
      <div 
        id="equity_chart_inner" 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
});

EquityChart.displayName = "EquityChart";

export default function StocksPage() {
  const { 
    stockAssets, 
    stockBotActive, 
    stockBotRisk, 
    stockBotLogs, 
    totalBotEarnings,
    isAnalyzingStocks,
    kycStatus,
    updateStockBotSettings,
    clearStockBotLogs
  } = useWalletStore();

  const [localRisk, setLocalRisk] = useState<'low' | 'medium' | 'high'>(stockBotRisk);
  const [chartSymbol, setChartSymbol] = useState("NASDAQ:AAPL");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stockBotLogs]);

  const handleToggleBot = () => {
    if (kycStatus !== 'verified') {
      toast({ title: "Institutional Compliance Required", description: "You must complete regulatory KYC to enable RWA agents.", variant: "destructive" });
      return;
    }
    updateStockBotSettings(!stockBotActive, localRisk);
  };

  if (kycStatus !== 'verified') {
    return (
      <div className="max-w-4xl mx-auto py-20">
        <Card className="rounded-[3rem] border-dashed border-2 p-12 text-center space-y-8 bg-card/50 backdrop-blur-xl">
          <div className="h-24 w-24 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto border-2 border-amber-500/20 shadow-2xl shadow-amber-500/5 rotate-3">
            <ShieldAlert className="h-12 w-12 text-amber-600" />
          </div>
          <div className="space-y-4 max-w-lg mx-auto">
            <h2 className="text-4xl font-black text-primary tracking-tighter">Regulatory Compliance Required</h2>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed">
              Trading tokenized stocks and bonds (RWA) in **Jamaica** requires institutional identity verification. Secure your session to unlock Equity Enclaves.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
             <div className="p-4 rounded-2xl bg-muted/50 border space-y-1">
               <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Protocol</span>
               <p className="text-xs font-bold">Jamaica FSC Compliance</p>
             </div>
             <div className="p-4 rounded-2xl bg-muted/50 border space-y-1">
               <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Status</span>
               <p className="text-xs font-bold text-amber-600 uppercase">Verification Needed</p>
             </div>
          </div>
          <Button size="lg" className="h-16 px-10 text-xl font-black rounded-2xl shadow-2xl gap-3 group" asChild>
            <Link href="/kyc">
              Complete Compliance Enclave
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

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
            Decentralized Equity Enclave. Managing tokenized stocks & bonds (RWA).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] border-2",
            stockBotActive ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            <div className={cn("h-2 w-2 rounded-full mr-2", stockBotActive ? "bg-green-500 animate-pulse" : "bg-amber-500")} />
            Protocol Link: {stockBotActive ? 'LIVE' : 'STANDBY'}
          </Badge>
          <Button 
            onClick={handleToggleBot} 
            variant={stockBotActive ? "destructive" : "default"}
            className="h-12 px-8 font-bold rounded-2xl shadow-xl gap-2 transition-all"
          >
            {stockBotActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {stockBotActive ? 'Deactivate Agent' : 'Activate RWA Agent'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Unified Yield</p>
                  <p className="text-4xl font-black tracking-tighter">
                    ${totalBotEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Trophy className="h-7 w-7 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-primary/10 shadow-xl">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tokenized Valuation</p>
                  <p className="text-4xl font-black tracking-tighter text-primary">
                    ${stockAssets.reduce((acc, s) => acc + s.totalValue, 0).toLocaleString()}
                  </p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center border-secondary/20">
                  <Layers className="h-7 w-7 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-secondary" />
                Equity Vision: {chartSymbol}
              </h3>
            </div>
            <EquityChart symbol={chartSymbol} />
          </div>

          <Card className="bg-slate-950 text-slate-50 border-none shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between px-8 py-6">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/50 font-mono">RWA Analysis Feed</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isAnalyzingStocks && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-secondary mr-4">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    RUNNING ANALYSIS
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
                  <Target className="h-16 w-16" />
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
                Agent Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">Risk Tolerance</Label>
                  <Select value={localRisk} onValueChange={(v: any) => setLocalRisk(v)} disabled={stockBotActive}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="Select Risk" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Conservative (Bond-Tokens Focus)</SelectItem>
                      <SelectItem value="medium">Balanced (Index-Tokens Focus)</SelectItem>
                      <SelectItem value="high">Aggressive (Growth-Tokens Focus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-70">RWA Vision Target</Label>
                  <Select value={chartSymbol} onValueChange={setChartSymbol}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="NASDAQ:AAPL">Apple Token (bAAPL)</SelectItem>
                      <SelectItem value="NASDAQ:GOOGL">Google Token (bGOOGL)</SelectItem>
                      <SelectItem value="NASDAQ:TSLA">Tesla Token (bTSLA)</SelectItem>
                      <SelectItem value="AMEX:BND">Bond Token (bBND)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-900 text-white space-y-4">
                <h4 className="text-sm font-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-secondary" />
                  RWA Protocol Security
                </h4>
                <p className="text-[10px] opacity-70 leading-relaxed font-medium">
                  The Antigravity RWA Agent utilizes institutional rebalancing models to optimize Tokenized Equity and Debt allocations within your secure enclave.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] shadow-xl border-primary/10 bg-card/50 p-6 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Tokenized Holdings
            </h3>
            <div className="space-y-3">
              {stockAssets.length > 0 ? stockAssets.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                  <div>
                    <div className="font-bold text-xs">{s.symbol}</div>
                    <div className="text-[10px] text-muted-foreground">{s.shares} token units</div>
                  </div>
                  <div className="text-xs font-bold">${s.totalValue.toLocaleString()}</div>
                </div>
              )) : (
                <p className="text-[10px] text-center text-muted-foreground opacity-50 py-4 font-bold uppercase">No tokenized holdings</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
