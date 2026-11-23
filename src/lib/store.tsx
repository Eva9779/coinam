'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment,
  arrayUnion
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance } from './blockchain';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface WalletAsset {
  id: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive: boolean;
  privateKey?: string; 
  isPrimary?: boolean;
}

export interface StockAsset {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  totalValue: number;
}

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

interface WalletContextType {
  assets: WalletAsset[];
  stockAssets: StockAsset[];
  transactions: any[];
  initialized: boolean;
  isSyncing: boolean;
  user: any;
  totalBotEarnings: number;
  botActive: boolean;
  botAllocation: number;
  botRiskLevel: 'low' | 'medium' | 'high';
  botStrategy: string;
  botLogs: BotLog[];
  stockBotActive: boolean;
  stockBotAllocation: number;
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotLogs: BotLog[];
  marketData: any[];
  isAnalyzingStocks: boolean;
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: string) => void;
  updateStockBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  addBotLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStockBotLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number, vault: number }>;
  generateNewWallet: (curr: string, label?: string) => Promise<void>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([
    { symbol: 'NVDA', name: 'NVIDIA Corp', shares: 0, avgPrice: 725.10, totalValue: 0 },
    { symbol: 'TQQQ', name: 'ProShares Ultra QQQ', shares: 0, avgPrice: 58.40, totalValue: 0 },
  ]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(20);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState('standard');
  
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(20);
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');

  const [baselinePrices, setBaselinePrices] = useState<Record<string, number>>({});
  const [cryptoPositions, setCryptoPositions] = useState<any[]>([]);

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingCryptoRef = useRef(false);

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setBotLogs(prev => [...prev.slice(-49), newLog]);
    if (db && user && (type === 'success' || type === 'warning' || type === 'error')) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { botLogs: arrayUnion(newLog) }, { merge: true });
    }
  }, [db, user]);

  const addStockBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setStockBotLogs(prev => [...prev.slice(-49), newLog]);
    if (db && user && (type === 'success' || type === 'warning' || type === 'error')) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { stockBotLogs: arrayUnion(newLog) }, { merge: true });
    }
  }, [db, user]);

  const triggerCryptoAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!botActive || isAnalyzingCryptoRef.current || !user || !db) return;
    isAnalyzingCryptoRef.current = true;
    
    try {
      const profitTarget = 1.021; // +2.1%
      const dipThreshold = -1.5;   // -1.5%
      let harvestableFound = false;

      // 1. Scan Main Wallet Assets (The 0.0121 ETH etc.)
      for (const asset of assets) {
        if (asset.currency === 'USDC' || asset.amount <= 0) continue;
        
        const marketAsset = currentMarket.find(m => m.currency === asset.currency);
        const livePrice = marketAsset?.currentPriceUSD || 0;
        const entryPrice = baselinePrices[asset.currency];
        
        if (!entryPrice) {
          const userRef = doc(db, 'users', user.uid);
          setDoc(userRef, { baselinePrices: { ...baselinePrices, [asset.currency]: livePrice } }, { merge: true });
          continue;
        }

        const currentProfit = ((livePrice / entryPrice) - 1) * 100;
        if (currentProfit >= 2.1) {
          const totalValue = asset.amount * livePrice;
          const profit = totalValue * 0.021;
          const principal = totalValue - profit;

          addBotLog(`WALLET HARVEST: ${asset.currency} reached +${currentProfit.toFixed(2)}%! Executing +2.1% Sell.`, 'success');
          
          const usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
          const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
          const userRef = doc(db, 'users', user.uid);
          
          if (usdcAsset) {
            const usdcRef = doc(db, 'users', user.uid, 'assets', usdcAsset.id);
            setDoc(usdcRef, { amount: increment(principal), fiatValueUSD: increment(principal) }, { merge: true });
          }

          setDoc(userRef, { totalBotEarnings: increment(profit), [`baselinePrices.${asset.currency}`]: livePrice }, { merge: true });
          setDoc(assetRef, { amount: 0, fiatValueUSD: 0 }, { merge: true });
          
          addTransaction({
            type: 'trade',
            currency: `${asset.currency} → USDC`,
            amount: asset.amount,
            fiatValueUSD: totalValue,
            description: `Automated +2.1% Profit Harvest`
          });
          harvestableFound = true;
          break;
        }
      }

      // 2. Scan Micro Positions
      if (!harvestableFound) {
        for (const p of cryptoPositions) {
            const liveAsset = currentMarket.find(m => m.currency === p.currency);
            const livePrice = liveAsset ? liveAsset.currentPriceUSD : p.entryPrice;
            const targetPrice = p.entryPrice * profitTarget;
            const currentProfit = ((livePrice / p.entryPrice) - 1) * 100;

            if (livePrice >= targetPrice) {
                const profit = p.cost * 0.021;
                addBotLog(`HARVEST: +2.1% hit for ${p.currency} position! Settling yield.`, 'success');
                const updatedPositions = cryptoPositions.filter(pos => pos.id !== p.id);
                setDoc(doc(db, 'users', user.uid), { botAllocation: increment(p.cost), totalBotEarnings: increment(profit), cryptoPositions: updatedPositions }, { merge: true });
                harvestableFound = true;
                break; 
            }
        }
      }

      // 3. Scan for Dips (-1.5%)
      if (!harvestableFound && botAllocation >= 5.0 && cryptoPositions.length < 5) {
          const dipAsset = currentMarket.find(m => m.dailyChangePercent <= dipThreshold && !cryptoPositions.some(p => p.currency === m.currency));
          if (dipAsset) {
              const cost = 5.0;
              const entryPrice = dipAsset.currentPriceUSD;
              const newPos = { currency: dipAsset.currency, cost, entryPrice, id: Date.now() };
              addBotLog(`DIP BUY: ${dipAsset.currency} dropped ${dipAsset.dailyChangePercent.toFixed(2)}%. Buying @ $${entryPrice.toLocaleString()}.`, 'success');
              setDoc(doc(db, 'users', user.uid), { botAllocation: increment(-cost), cryptoPositions: arrayUnion(newPos) }, { merge: true });
          } else {
            addBotLog(`ENCLAVE SCAN: Tracking mainnet momentum... Target: +2.1%.`, 'info');
          }
      }
    } catch (e: any) {
      addBotLog(`STRATEGY ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingCryptoRef.current = false;
    }
  }, [botActive, botAllocation, user, db, addBotLog, cryptoPositions, assets, baselinePrices]);

  const triggerStockAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!stockBotActive || isAnalyzingStocks || !user || !db) return;
    setIsAnalyzingStocks(true);
    try {
      addStockBotLog("EQUITY SCAN: Analyzing tokenized RWA momentum...", 'info');
      // Simulated restoration logic for stock dips
      const dipAsset = currentMarket.find(m => (m.currency === 'NVD' || m.currency === 'TQQQ') && m.dailyChangePercent <= -1.0);
      if (dipAsset && stockBotAllocation >= 10) {
        addStockBotLog(`DIP BUY: Accumulating ${dipAsset.currency} tokenized equity at $${dipAsset.currentPriceUSD}.`, 'success');
        setDoc(doc(db, 'users', user.uid), { stockBotAllocation: increment(-10) }, { merge: true });
      }
    } finally {
      setIsAnalyzingStocks(false);
    }
  }, [stockBotActive, isAnalyzingStocks, user, db, addStockBotLog, stockBotAllocation]);

  useEffect(() => {
    if (!db || !user) return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        setTotalBotEarnings(d.totalBotEarnings || 0);
        setBotActive(!!d.botActive);
        setBotAllocation(d.botAllocation || 20);
        setBotRiskLevel(d.botRiskLevel || 'medium');
        setBotStrategy(d.botStrategy || 'standard');
        setCryptoPositions(d.cryptoPositions || []);
        setBaselinePrices(d.baselinePrices || {});
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 20);
        setStockBotRisk(d.stockBotRisk || 'medium');
        if (d.botLogs) setBotLogs(d.botLogs.slice(-50));
        if (d.stockBotLogs) setStockBotLogs(d.stockBotLogs.slice(-50));
      }
    });
    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      setAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset)));
      setInitialized(true);
      setIsSyncing(false);
    });
    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    return () => { unsubProfile(); unsubAssets(); unsubTx(); };
  }, [db, user]);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) return;
        const data = await response.json();
        const mapping: Record<string, string> = { 'bitcoin': 'BTC', 'ethereum': 'ETH', 'binancecoin': 'BNB', 'solana': 'SOL', 'ripple': 'XRP' };
        const updatedMarket = marketData.map(m => {
          const coinId = Object.keys(mapping).find(key => mapping[key] === m.currency);
          return (coinId && data[coinId]) ? { ...m, currentPriceUSD: data[coinId].usd, dailyChangePercent: data[coinId].usd_24h_change || 0 } : m;
        });
        setMarketData(updatedMarket);
        if (botActive) triggerCryptoAnalysis(updatedMarket);
        if (stockBotActive) triggerStockAnalysis(updatedMarket);
      } catch (e) {
        console.warn("Mainnet RPC limited.");
      }
    };
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, [botActive, stockBotActive, triggerCryptoAnalysis, triggerStockAnalysis]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    const data = { ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed' };
    setDoc(txRef, data).catch(() => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: txRef.path, operation: 'create', requestResourceData: data }));
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      setDoc(doc(db, 'users', user.uid, 'assets', asset.id), { amount: increment(amount), fiatValueUSD: increment(amount * fiatPrice) }, { merge: true });
    }
  }, [db, user, assets]);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
    if (!usdcAsset) return;
    setDoc(doc(db, 'users', user.uid, 'assets', usdcAsset.id), { amount: increment(totalBotEarnings), fiatValueUSD: increment(totalBotEarnings) }, { merge: true });
    setDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 }, { merge: true });
    addTransaction({ type: 'receive', currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, description: 'Settled Strategy Yield' });
  };

  const syncOnChainBalance = async (addr: string, curr: string) => {
    const asset = assets.find(a => a.address === addr);
    return { onChain: 0, vault: asset?.amount || 0 };
  };

  const generateNewWallet = async (curr: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'assets', id), {
      currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
    });
  };

  const importPrivateKey = async (curr: string, key: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'assets', id), {
      currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      privateKey: key
    });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs, 
      stockBotActive, stockBotAllocation, stockBotRisk, stockBotLogs,
      marketData, isAnalyzingStocks,
      addTransaction, updateBalance, syncOnChainBalance, generateNewWallet, importPrivateKey,
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        const currentBaselines: Record<string, number> = { ...baselinePrices };
        if (active) {
          assets.forEach(a => {
            if (a.amount > 0 && !currentBaselines[a.currency]) {
              const livePrice = marketData.find(m => m.currency === a.currency)?.currentPriceUSD || 0;
              if (livePrice > 0) currentBaselines[a.currency] = livePrice;
            }
          });
        }
        setDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy, baselinePrices: currentBaselines }, { merge: true });
        addBotLog(active ? "ALPHA AGENT: ACTIVE (+2.1%)" : "AGENT STANDBY", active ? "success" : "warning");
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        setDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk }, { merge: true });
        addStockBotLog(active ? "RWA AGENT: ACTIVE (+2.1%)" : "RWA AGENT STANDBY", active ? "success" : "warning");
      },
      clearBotLogs: () => {
        setBotLogs([]);
        if (db && user) setDoc(doc(db, 'users', user.uid), { botLogs: [] }, { merge: true });
      },
      clearStockBotLogs: () => {
        setStockBotLogs([]);
        if (db && user) setDoc(doc(db, 'users', user.uid), { stockBotLogs: [] }, { merge: true });
      },
      liquidateEarnings, addBotLog, addStockBotLog
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletStore() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWalletStore must be used within WalletProvider');
  return context;
}
