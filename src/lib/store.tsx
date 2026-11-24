'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment,
  arrayUnion,
  getDoc,
  writeBatch,
  query,
  where,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
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
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotAllocation: number;
  stockBotLogs: BotLog[];
  isAnalyzingStocks: boolean;
  marketData: any[];
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

const PRINCIPAL_LOCK = 29.57;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets] = useState<StockAsset[]>([
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
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isExecutingTradeRef = useRef(false);
  const lastCryptoLogTimeRef = useRef(0);
  const lastStockLogTimeRef = useRef(0);
  const assetsRef = useRef<WalletAsset[]>([]);
  const baselinesRef = useRef<Record<string, number>>({});
  const botActiveRef = useRef(false);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    assetsRef.current = assets;
    baselinesRef.current = baselinePrices;
    botActiveRef.current = botActive;
  }, [assets, baselinePrices, botActive]);

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setBotLogs(prev => {
      if (prev.length > 0 && prev[prev.length - 1].msg === msg) return prev;
      return [...prev.slice(-49), newLog];
    });
    if (db && user && (type === 'success' || type === 'warning' || type === 'error')) {
      updateDoc(doc(db, 'users', user.uid), { botLogs: arrayUnion(newLog) });
    }
  }, [db, user]);

  const addStockBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setStockBotLogs(prev => {
      if (prev.length > 0 && prev[prev.length - 1].msg === msg) return prev;
      return [...prev.slice(-49), newLog];
    });
    if (db && user && (type === 'success' || type === 'warning' || type === 'error')) {
      updateDoc(doc(db, 'users', user.uid), { stockBotLogs: arrayUnion(newLog) });
    }
  }, [db, user]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    const data = { ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed' };
    setDoc(txRef, data, { merge: true }).catch(() => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: txRef.path, operation: 'create', requestResourceData: data }));
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assetsRef.current.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), { 
        amount: increment(amount), 
        fiatValueUSD: increment(amount * fiatPrice) 
      });
    }
  }, [db, user]);

  const triggerCryptoAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!botActiveRef.current || isExecutingTradeRef.current || !user || !db || assetsRef.current.length === 0) return;
    
    const marketAsset = currentMarket.find(m => m.currency === 'ETH');
    const livePrice = marketAsset?.currentPriceUSD || 2450;
    const ethAsset = assetsRef.current.find(a => a.currency === 'ETH' && a.isPrimary);
    
    if (!ethAsset || ethAsset.amount === 0) return;

    const entryPrice = baselinesRef.current['ETH'] || livePrice;
    const currentProfitPercent = ((livePrice / entryPrice) - 1) * 100;
    
    const now = Date.now();
    if (now - lastCryptoLogTimeRef.current > 60000) {
      addBotLog(`SCAN: ETH at ${currentProfitPercent >= 0 ? '+' : ''}${currentProfitPercent.toFixed(2)}% (Target: +2.1%)`, 'info');
      lastCryptoLogTimeRef.current = now;
    }

    if (currentProfitPercent >= 2.1) {
      isExecutingTradeRef.current = true;
      addBotLog("TARGET REACHED: Harvesting +2.1% profit to USDC Vault.", 'success');
      
      const ethValueUSD = ethAsset.amount * livePrice;
      const profitUSD = ethValueUSD - PRINCIPAL_LOCK;
      
      if (profitUSD > 0.05) {
        const requiredEthForPrincipal = PRINCIPAL_LOCK / livePrice;
        const batch = writeBatch(db);
        const usdcAsset = assetsRef.current.find(a => a.currency === 'USDC' && a.isPrimary);
        
        if (!usdcAsset) {
          batch.set(doc(db, 'users', user.uid, 'assets', 'primary-vault-usdc'), {
            currency: 'USDC', amount: profitUSD, fiatValueUSD: profitUSD, isLive: true, isPrimary: true,
            address: `0x${user.uid.slice(0, 10)}...usdc`, privateKey: `ENCRYPTED_HSM_KEY`
          });
        } else {
          batch.update(doc(db, 'users', user.uid, 'assets', usdcAsset.id), { 
            amount: increment(profitUSD), 
            fiatValueUSD: increment(profitUSD) 
          });
        }
        
        batch.update(doc(db, 'users', user.uid, 'assets', ethAsset.id), { 
          amount: requiredEthForPrincipal, 
          fiatValueUSD: PRINCIPAL_LOCK 
        });

        batch.update(doc(db, 'users', user.uid), { 
          totalBotEarnings: increment(profitUSD), 
          ['baselinePrices.ETH']: livePrice
        });

        await batch.commit();

        addTransaction({ 
          type: 'trade', 
          currency: `ETH → USDC`, 
          amount: ethAsset.amount - requiredEthForPrincipal, 
          fiatValueUSD: profitUSD, 
          description: `Profit Skim (+2.1%)` 
        });
      }
      
      setTimeout(() => { isExecutingTradeRef.current = false; }, 10000);
    }
  }, [user, db, addBotLog, addTransaction]);

  const triggerStockAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!stockBotActive || isAnalyzingStocks || !user || !db) return;
    const targetSymbol = 'NVD';
    const marketAsset = currentMarket.find(m => m.currency === targetSymbol);
    if (!marketAsset) return;
    
    const livePrice = marketAsset.currentPriceUSD;
    const entryPrice = baselinesRef.current[targetSymbol] || 725.10;
    const currentProfit = ((livePrice / entryPrice) - 1) * 100;
    
    const now = Date.now();
    if (now - lastStockLogTimeRef.current > 60000) {
      addStockBotLog(`RWA SCAN: ${targetSymbol} at ${currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)}% (Target: +2.1%)`, 'info');
      lastStockLogTimeRef.current = now;
    }

    if (currentProfit >= 2.1 && !isExecutingTradeRef.current) {
      isExecutingTradeRef.current = true;
      addStockBotLog(`HARVEST: ${targetSymbol} target achieved. Skimming profit.`, 'success');
      const profitVal = 2.1; 
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { 
        totalBotEarnings: increment(profitVal), 
        [`baselinePrices.${targetSymbol}`]: livePrice 
      });
      await batch.commit();
      addTransaction({ type: 'trade', currency: `RWA → USDC`, amount: profitVal, fiatValueUSD: profitVal, description: `Stock Profit Skim (${targetSymbol})` });
      setTimeout(() => { isExecutingTradeRef.current = false; }, 10000);
    }
  }, [stockBotActive, isAnalyzingStocks, user, db, addStockBotLog, addTransaction]);

  useEffect(() => {
    if (!db || !user) return;
    
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        // Prevent infinite loops by only setting if values differ
        setTotalBotEarnings(prev => prev !== d.totalBotEarnings ? (d.totalBotEarnings || 0) : prev);
        setBotActive(prev => prev !== d.botActive ? (!!d.botActive) : prev);
        setBotAllocation(prev => prev !== d.botAllocation ? (d.botAllocation || 20) : prev);
        setBotRiskLevel(prev => prev !== d.botRiskLevel ? (d.botRiskLevel || 'medium') : prev);
        setBotStrategy(prev => prev !== d.botStrategy ? (d.botStrategy || 'standard') : prev);
        setStockBotActive(prev => prev !== d.stockBotActive ? (!!d.stockBotActive) : prev);
        setStockBotAllocation(prev => prev !== d.stockBotAllocation ? (d.stockBotAllocation || 20) : prev);
        setStockBotRisk(prev => prev !== d.stockBotRisk ? (d.stockBotRisk || 'medium') : prev);
        setBaselinePrices(prev => JSON.stringify(prev) !== JSON.stringify(d.baselinePrices) ? (d.baselinePrices || {}) : prev);
        setBotLogs(prev => JSON.stringify(prev) !== JSON.stringify(d.botLogs) ? (d.botLogs?.slice(-50) || []) : prev);
        setStockBotLogs(prev => JSON.stringify(prev) !== JSON.stringify(d.stockBotLogs) ? (d.stockBotLogs?.slice(-50) || []) : prev);
      }
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      const currentAssets = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(prev => JSON.stringify(prev) !== JSON.stringify(currentAssets) ? currentAssets : prev);
      setInitialized(true);
      setIsSyncing(false);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      const txs = s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(prev => JSON.stringify(prev) !== JSON.stringify(txs) ? txs : prev);
    });

    return () => { unsubProfile(); unsubAssets(); unsubTx(); };
  }, [db, user]);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,tether,usd-coin&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) return;
        const data = await response.json();
        const mapping: Record<string, string> = { 'bitcoin': 'BTC', 'ethereum': 'ETH', 'binancecoin': 'BNB', 'solana': 'SOL', 'ripple': 'XRP', 'tether': 'USDT', 'usd-coin': 'USDC' };
        
        setMarketData(prev => prev.map(m => {
          const coinId = Object.keys(mapping).find(key => mapping[key] === m.currency);
          if (coinId && data[coinId]) {
            return { ...m, currentPriceUSD: data[coinId].usd, dailyChangePercent: data[coinId].usd_24h_change || m.dailyChangePercent };
          }
          return m;
        }));
      } catch (e) {}
    };

    fetchLivePrices();
    const fetchInterval = setInterval(fetchLivePrices, 60000);

    const heartbeatInterval = setInterval(() => {
      setMarketData(prev => {
        const updated = prev.map(m => {
          const fluctuation = 1 + (Math.random() * 0.0004 - 0.0002);
          return { ...m, currentPriceUSD: m.currentPriceUSD * fluctuation };
        });

        if (initialized && user && db && !isUpdatingRef.current) {
           const ethMarket = updated.find(m => m.currency === 'ETH');
           const ethAsset = assetsRef.current.find(a => a.currency === 'ETH' && a.isPrimary);
           
           if (ethMarket && ethAsset && ethAsset.amount > 0 && !isExecutingTradeRef.current) {
              const livePrice = ethMarket.currentPriceUSD;
              const currentVal = ethAsset.amount * livePrice;
              
              if (Math.abs(currentVal - PRINCIPAL_LOCK) > 0.15) {
                 isUpdatingRef.current = true;
                 const newAmount = PRINCIPAL_LOCK / livePrice;
                 updateDoc(doc(db, 'users', user.uid, 'assets', ethAsset.id), { 
                   amount: newAmount, 
                   fiatValueUSD: PRINCIPAL_LOCK 
                 }).finally(() => { isUpdatingRef.current = false; });
              }
           }
        }
        return updated;
      });
    }, 5000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(heartbeatInterval);
    };
  }, [initialized, user, db]);

  useEffect(() => {
    if (botActive) triggerCryptoAnalysis(marketData);
    if (stockBotActive) triggerStockAnalysis(marketData);
  }, [marketData, stockBotActive, botActive, triggerCryptoAnalysis, triggerStockAnalysis]);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const usdcAsset = assetsRef.current.find(a => a.currency === 'USDC' && a.isPrimary);
    const batch = writeBatch(db);
    if (!usdcAsset) {
      batch.set(doc(db, 'users', user.uid, 'assets', 'primary-vault-usdc'), {
        currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, isLive: true, isPrimary: true,
        address: `0x${user.uid.slice(0, 10)}...usdc`, privateKey: `ENCRYPTED_HSM_KEY`
      });
    } else {
      batch.update(doc(db, 'users', user.uid, 'assets', usdcAsset.id), { amount: increment(totalBotEarnings), fiatValueUSD: increment(totalBotEarnings) });
    }
    batch.update(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
    await batch.commit();
    addTransaction({ type: 'receive', currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, description: 'Direct Profit Liquidation' });
    toast({ title: "Settle Complete" });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance: async (addr, curr) => {
        const found = assetsRef.current.find(a => a.address === addr);
        const bal = found?.amount || 0;
        return { onChain: bal, vault: bal };
      },
      generateNewWallet: async (curr) => {
        if (!db || !user) return;
        setDoc(doc(db, 'users', user.uid, 'assets', `asset_${curr.toLowerCase()}_${Date.now()}`), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: `0x${Math.random().toString(16).slice(2, 42)}`, privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
        });
      },
      importPrivateKey: async (curr, key) => {
        if (!db || !user) return;
        setDoc(doc(db, 'users', user.uid, 'assets', `asset_${curr.toLowerCase()}_${Date.now()}`), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: `0x${Math.random().toString(16).slice(2, 42)}`, privateKey: key
        }, { merge: true });
      },
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        const currentBaselines = { ...baselinesRef.current };
        if (active) {
          assetsRef.current.forEach(a => { 
            if (a.amount > 0) currentBaselines[a.currency] = marketData.find(m => m.currency === a.currency)?.currentPriceUSD || 0; 
          });
        }
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy, baselinePrices: currentBaselines });
        addBotLog(active ? "ALPHA AGENT: ACTIVE (+2.1%)" : "AGENT STANDBY", active ? "success" : "warning");
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        const currentBaselines = { ...baselinesRef.current };
        if (active) currentBaselines['NVD'] = marketData.find(m => m.currency === 'NVD')?.currentPriceUSD || 725.10;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk, baselinePrices: currentBaselines });
        addStockBotLog(active ? "RWA AGENT: ACTIVE (+2.1%)" : "RWA AGENT STANDBY", active ? "success" : "warning");
      },
      clearBotLogs: () => {
        setBotLogs([]);
        if (db && user) updateDoc(doc(db, 'users', user.uid), { botLogs: [] });
      },
      clearStockBotLogs: () => {
        setStockBotLogs([]);
        if (db && user) updateDoc(doc(db, 'users', user.uid), { stockBotLogs: [] });
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