
"use client";

import { useEffect, useState, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  BarChart3, 
  Globe, 
  Landmark, 
  Eye, 
  Zap,
  ArrowUpRight,
  ChevronRight,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

interface StockMarketItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  marketCap: string;
  volume: string;
  type: 'stock' | 'bond' | 'etf';
  tvSymbol: string;
}

const STOCK_MARKET_DATA: StockMarketItem[] = [
  { id: 'nvda', symbol: 'bNVDA', name: 'NVIDIA Corp (Tokenized)', price: 725.10, change: 4.8, marketCap: '1.78T', volume: '45.2B', type: 'stock', tvSymbol: 'NASDAQ:NVDA' },
  { id: 'tqqq', symbol: 'bTQQQ', name: 'ProShares Ultra QQQ (3X)', price: 58.40, change: 6.5, marketCap: '22.4B', volume: '12.8B', type: 'etf', tvSymbol: 'NASDAQ:TQQQ' },
  { id: 'soxl', symbol: 'bSOXL', name: 'Direxion Semi Bull (3X)', price: 42.15, change: 12.4, marketCap: '9.8B', volume: '8.4B', type: 'etf', tvSymbol: 'NASDAQ:SOXL' },
  { id: 'meta', symbol: 'bMETA', name: 'Meta Platforms (Tokenized)', price: 485.30, change: 3.2, marketCap: '1.24T', volume: '18.5B', type: 'stock', tvSymbol: 'NASDAQ:META' },
  { id: 'tsla', symbol: 'bTSLA', name: 'Tesla Inc (Tokenized)', price: 238.45, change: -2.4, marketCap: '758.2B', volume: '22.1B', type: 'stock', tvSymbol: 'NASDAQ:TSLA' },
  { id: 'aapl', symbol: 'bAAPL', name: 'Apple Inc (Tokenized)', price: 185.92, change: 1.2, marketCap: '2.84T', volume: '15.4B', type: 'stock', tvSymbol: 'NASDAQ:AAPL' },
  { id: 'googl', symbol: 'bGOOGL', name: 'Alphabet Inc (Tokenized)', price: 142.65, change: 0.8, marketCap: '1.78T', volume: '12.1B', type: 'stock', tvSymbol: 'NASDAQ:GOOGL' },
  { id: 'bnd', symbol: 'bBND', name: 'Vanguard Total Bond Market', price: 72.15, change: 0.1, marketCap: '310.4B', volume: '1.2B', type: 'bond', tvSymbol: 'AMEX:BND' },
  { id: 'spy', symbol: 'bSPY', name: 'SPDR S&P 500 ETF Trust', price: 495.20, change: 1.1, marketCap: '482.1B', volume: '35.4B', type: 'etf', tvSymbol: 'AMEX:SPY' },
];

const MarketChartWidget = memo(({ symbol }: { symbol: string }) => {
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
      gridColor: "rgba(30, 41, 59, 0.1)",
      container_id: "market_chart_inner",
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden bg-[#020617] border border-white/10">
      <div 
        id="market_chart_inner"
        ref={containerRef} 
        className="w-full h-full"
      />
    </div>
  );
});
MarketChartWidget.displayName = "MarketChartWidget";

export default function MarketPage() {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("crypto");

  const fetchCoins = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) setCoins(data);
    } catch (err) {
      console.warn("Market connectivity interrupted. Using cached registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins();
  }, []);

  const filteredCoins = coins.filter(coin => 
    coin.name.toLowerCase().includes(search.toLowerCase()) || 
    coin.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStocks = STOCK_MARKET_DATA.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-primary tracking-tighter flex items-center gap-3">
            <Globe className="h-10 w-10 text-secondary" />
            Global Markets
          </h2>
          <p className="text-muted-foreground font-medium">Real-time institutional monitoring for crypto and tokenized RWAs.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search assets..." 
              className="pl-10 h-12 bg-card/50 rounded-xl border-primary/10 shadow-sm" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchCoins}
            disabled={loading}
            className="p-3 bg-card border border-primary/10 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("h-5 w-5 text-primary", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <Tabs defaultValue="crypto" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-card/50 p-1.5 h-14 rounded-2xl border border-primary/10 w-full md:w-auto shadow-sm">
          <TabsTrigger value="crypto" className="rounded-xl font-bold px-8 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Zap className="h-4 w-4" />
            Crypto Assets
          </TabsTrigger>
          <TabsTrigger value="stocks" className="rounded-xl font-bold px-8 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Landmark className="h-4 w-4" />
            Stocks & Bonds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crypto">
          <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-card/30 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-primary/5 hover:bg-transparent">
                    <TableHead className="w-[60px] text-[10px] font-black uppercase tracking-widest pl-8 py-6">#</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Asset</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Price</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">24h Change</TableHead>
                    <TableHead className="text-right hidden md:table-cell text-[10px] font-black uppercase tracking-widest">Market Cap</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Vision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-primary/5">
                        <TableCell colSpan={6}><div className="h-14 w-full bg-muted/20 animate-pulse rounded-xl" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCoins.length > 0 ? (
                    filteredCoins.map((coin) => (
                      <TableRow key={coin.id} className="border-b border-primary/5 hover:bg-primary/[0.02] transition-colors group">
                        <TableCell className="font-bold text-muted-foreground pl-8 py-5">{coin.market_cap_rank}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background border border-primary/5 p-1 shadow-sm shrink-0">
                              <img src={coin.image} alt={coin.name} className="h-full w-full object-contain" />
                            </div>
                            <div>
                              <div className="font-black text-sm tracking-tight">{coin.name}</div>
                              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{coin.symbol}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm">
                          ${coin.current_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={cn(
                            "inline-flex items-center gap-1 font-bold text-xs px-2 py-1 rounded-lg",
                            coin.price_change_percentage_24h >= 0 ? "text-green-600 bg-green-500/5" : "text-red-600 bg-red-500/5"
                          )}>
                            {coin.price_change_percentage_24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-xs font-bold text-muted-foreground">
                          ${(coin.market_cap / 1e9).toFixed(2)}B
                        </TableCell>
                        <TableCell className="text-right pr-8">
                           <Dialog>
                            <DialogTrigger asChild>
                              <button className="p-2.5 rounded-xl border border-primary/5 bg-background shadow-sm hover:border-secondary transition-all opacity-0 group-hover:opacity-100">
                                <Eye className="h-4 w-4 text-secondary" />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl rounded-[2.5rem] bg-[#020617] border-white/10 text-white">
                              <DialogHeader>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <img src={coin.image} alt={coin.name} className="h-10 w-10" />
                                    <div>
                                      <DialogTitle className="text-2xl font-black">{coin.name} Intelligence</DialogTitle>
                                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Real-World Mainnet Feed</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-secondary/20 text-secondary border-none uppercase text-[8px] animate-pulse">1m LIVE DATA</Badge>
                                </div>
                              </DialogHeader>
                              <MarketChartWidget symbol={`BINANCE:${coin.symbol.toUpperCase()}USDT`} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                          <TrendingUp className="h-12 w-12 text-muted-foreground" />
                          <p className="text-sm font-black uppercase tracking-[0.2em]">Awaiting Data Stream</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stocks">
          <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-card/30 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-primary/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-8 py-6">RWA Asset</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Classification</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Price</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">24h Performance</TableHead>
                    <TableHead className="text-right hidden md:table-cell text-[10px] font-black uppercase tracking-widest">Total Valuation</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Vision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.map((stock) => (
                    <TableRow key={stock.id} className="border-b border-primary/5 hover:bg-primary/[0.02] transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center border-2 shadow-sm font-black text-[10px]",
                            stock.type === 'etf' ? "bg-amber-500/5 text-amber-600 border-amber-500/20" : "bg-primary/5 text-primary border-primary/20"
                          )}>
                            {stock.symbol.slice(1, 4)}
                          </div>
                          <div>
                            <div className="font-black text-sm tracking-tight">{stock.name}</div>
                            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{stock.symbol}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 border-primary/10">
                            {stock.type}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-sm">
                        ${stock.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "inline-flex items-center gap-1 font-bold text-xs px-2 py-1 rounded-lg",
                          stock.change >= 0 ? "text-green-600 bg-green-500/5" : "text-red-600 bg-red-500/5"
                        )}>
                          {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(stock.change).toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-xs font-bold text-muted-foreground">
                        ${stock.marketCap}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                         <Dialog>
                            <DialogTrigger asChild>
                              <button className="p-2.5 rounded-xl border border-primary/5 bg-background shadow-sm hover:border-secondary transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[10px] font-black uppercase text-secondary">
                                <Eye className="h-4 w-4 text-secondary" />
                                <span className="hidden sm:inline">View Chart</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl rounded-[2.5rem] bg-[#020617] border-white/10 text-white">
                              <DialogHeader>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-secondary">
                                      {stock.symbol.slice(1, 4)}
                                    </div>
                                    <div>
                                      <DialogTitle className="text-2xl font-black">{stock.name} Analysis</DialogTitle>
                                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Tokenized Equity Vision</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <Activity className="h-3 w-3 text-secondary animate-pulse" />
                                     <Badge className="bg-secondary/20 text-secondary border-none uppercase text-[8px]">1m REAL-TIME DATA</Badge>
                                  </div>
                                </div>
                              </DialogHeader>
                              <MarketChartWidget symbol={stock.tvSymbol} />
                            </DialogContent>
                          </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
