import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchYahooQuote(symbol: string, displayLabel: string) {
  try {
    // Official Yahoo Finance V8 Chart API for real-time discovery
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`,
      {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" 
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      }
    );
    
    if (!res.ok) throw new Error(`Yahoo Finance connectivity interrupted for ${symbol}`);
    
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const price = Number(meta?.regularMarketPrice || 0);
    const prevClose = Number(meta?.chartPreviousClose || price || 1);
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    // Build live intraday chart points from timestamps & close prices
    const timestamps: number[] = result?.timestamp || [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    const chartPoints = timestamps
      .map((ts, i) => ({
        time: new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        price: closes[i] != null ? Number(closes[i]!.toFixed(2)) : null
      }))
      .filter((p) => p.price !== null)
      .slice(-40);

    return {
      ticker: displayLabel,
      price,
      changePercent,
      chartPoints,
      updatedAt: meta?.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()
    };
  } catch (err) {
    console.warn(`Market discovery delayed for ${symbol}`);
    return { ticker: displayLabel, price: 0, changePercent: 0, chartPoints: [], updatedAt: Date.now() };
  }
}

export async function GET() {
  try {
    // 1. Live Real-World Crypto Feed (CoinGecko Public API)
    const [cgPriceRes, cgChartRes] = await Promise.all([
      fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
        { cache: "no-store", signal: AbortSignal.timeout(5000) }
      ),
      fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1",
        { cache: "no-store", signal: AbortSignal.timeout(5000) }
      )
    ]);

    const cgPrices = cgPriceRes.ok ? await cgPriceRes.json() : {};
    const cgChart = cgChartRes.ok ? await cgChartRes.json() : { prices: [] };

    const crypto = [
      {
        ticker: "BTC",
        price: Number(cgPrices?.bitcoin?.usd || 0),
        changePercent: Number(cgPrices?.bitcoin?.usd_24h_change || 0),
        updatedAt: Date.now()
      },
      {
        ticker: "ETH",
        price: Number(cgPrices?.ethereum?.usd || 0),
        changePercent: Number(cgPrices?.ethereum?.usd_24h_change || 0),
        updatedAt: Date.now()
      },
      {
        ticker: "SOL",
        price: Number(cgPrices?.solana?.usd || 0),
        changePercent: Number(cgPrices?.solana?.usd_24h_change || 0),
        updatedAt: Date.now()
      }
    ];

    const cryptoChartPoints = (cgChart?.prices || []).slice(-40).map(([ts, p]: [number, number]) => ({
      time: new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      price: Number(p.toFixed(2))
    }));

    // 2. Live Real-World Stock & Treasury Bond Feed (Yahoo Finance Discovery)
    const [nvda, soxx, tsla, shy] = await Promise.all([
      fetchYahooQuote("NVDA", "NVDA"),
      fetchYahooQuote("SOXX", "SOXX"),
      fetchYahooQuote("TSLA", "TSLA"),
      fetchYahooQuote("SHY", "US10Y")
    ]);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      crypto,
      cryptoChartPoints,
      rwa: [nvda, soxx, tsla, shy] // Map equities to RWA for Dashboard compatibility
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Institutional market feed error" }, { status: 500 });
  }
}
