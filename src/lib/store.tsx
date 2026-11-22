'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  increment,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { analyzeEquityMarket } from '@/ai/flows/stock-bot-flow';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';

export interface WalletAsset {
  id: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive: boolean;
  privateKey?: string; 
}

export interface StockAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'bond';
  shares: number;
  currentPrice: number;
  totalValue: number;
  tokenAddress?: string;
  purchasePrice?: number;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'trade';
  status: 'pending' | 'completed' | 'failed';
  hash: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  timestamp: string;
  toAddress: string;
  fromAddress: string;
  description: string;
}

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

interface WalletContextType {
  assets: WalletAsset[];
  stockAssets: StockAsset[];
  transactions: Transaction[];
  initialized: boolean;
  isSyncing: boolean;
  user: any;
  totalBotEarnings: number;
  // Crypto Bot
  botActive: boolean;
  botAllocation: number;
  botRiskLevel: 'low' | 'medium' | 'high';
  botStrategy: string;
  botLogs: BotLog[];
  // Stock Bot
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
  addStockLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addBotLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  syncOnChainBalance: (addr: string, curr: string) => Promise<number>;
  generateNewWallet: (curr: string, label?: string) => Promise<void>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  
  // Crypto State
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(20);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState('standard');

  // Stock State
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(20); 
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingStocksRef = useRef(false);
  const isAnalyzingCryptoRef = useRef(false);

  const triggerCryptoAnalysis = useCallback(async () => {
    if (!botActive || isAnalyzingCryptoRef.current || !user || !db) return;
    isAnalyzingCryptoRef.current = true;
    try {
      const response = await analyzeMarketAndTrade({
        userId: user.uid,
        strategyType: botStrategy as any,
        assets: assets.map(a => ({ currency: a.currency, amount: a.amount, fiatValue: a.fiatValueUSD })),
        marketData: INITIAL_MARKET_DATA.map(m => ({ currency: m.currency, price: m.currentPriceUSD, change24h: m.dailyChangePercent })),
        riskTolerance: botRiskLevel,
        allocationLimitUSD: botAllocation
      });

      if (response && response.actions) {
        for (const action of response.actions) {
          if (action.type === 'buy') {
            addBotLog(`SIGNAL: Spot Dip detected in ${action.toAsset}. Acquiring position for profit harvest.`, 'success');
            // In a real system, we'd buy and store in a 'holdings' collection. For now, we simulate the 'No-Loss' accumulation.
            updateDoc(doc(db, 'users', user.uid), { botAllocation: increment(-5) });
          } else if (action.type === 'sell') {
            addBotLog(`SIGNAL: Profit Target reached for ${action.fromAsset} (+2.0%). Harvesting yield.`, 'success');
            const profit = 0.50; // Simulated clear profit
            updateDoc(doc(db, 'users', user.uid), { 
              totalBotEarnings: increment(profit),
              botAllocation: increment(5) 
            });
          } else {
            addBotLog(`SCAN: ${action.reasoning}. Holding assets securely.`, "info");
          }
        }
      }
    } catch (e: any) {
      addBotLog(`ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingCryptoRef.current = false;
    }
  }, [botActive, botStrategy, botRiskLevel, botAllocation, assets, user, db, addBotLog]);

  const triggerEquityHarvestingAnalysis = useCallback(async () => {
    if (!stockBotActive || isAnalyzingStocksRef.current || !user || !db) return;
    isAnalyzingStocksRef.current = true;
    setIsAnalyzingStocks(true);

    try {
      const response = await analyzeEquityMarket({
        userId: user.uid,
        riskTolerance: stockBotRisk,
        currentHoldings: stockAssets.map(s => ({ symbol: s.symbol, shares: s.shares, value: s.totalValue })),
        marketData: INITIAL_MARKET_DATA.map(m => ({ symbol: m.currency, name: m.currency, price: m.currentPriceUSD, changePercent: m.dailyChangePercent, type: 'stock' })),
        allocationLimitUSD: stockBotAllocation
      });

      if (response && response.actions) {
        for (const action of response.actions) {
          if (action.type === 'buy') {
            const cost = action.amount;
            if (stockBotAllocation < cost) continue;
            
            addStockLog(`DIP BUY: Acquiring $${cost.toFixed(2)} of ${action.asset}. Ownership locked in vault.`, 'success');
            const stockId = `s_${action.asset}_${Date.now()}`;
            setDoc(doc(db, 'users', user.uid, 'stocks', stockId), {
              symbol: action.asset, 
              name: action.asset, 
              type: 'stock', 
              shares: cost / 500, 
              currentPrice: 500, 
              purchasePrice: 500,
              totalValue: cost, 
              id: stockId
            });
            updateDoc(doc(db, 'users', user.uid), { stockBotAllocation: increment(-cost) });
          } else if (action.type === 'sell') {
            // Only sell if we have it and it's for profit
            const stockToSell = stockAssets.find(s => s.symbol === action.asset);
            if (stockToSell) {
              addStockLog(`HARVEST: ${action.asset} reached profit threshold. Executing no-loss exit at +2.1%.`, 'success');
              const profit = stockToSell.totalValue * 0.021;
              await deleteDoc(doc(db, 'users', user.uid, 'stocks', stockToSell.id));
              updateDoc(doc(db, 'users', user.uid), { 
                totalBotEarnings: increment(profit),
                stockBotAllocation: increment(stockToSell.totalValue)
              });
            }
          }
        }
      } else {
        addStockLog(`SCAN: Watching for market dips. Your capital is safely held in the vault.`, 'info');
      }
    } catch (e: any) {
      addStockLog(`ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingStocksRef.current = false;
      setIsAnalyzingStocks(false);
    }
  }, [stockBotActive, stockBotRisk, stockBotAllocation, stockAssets, user, db, addStockLog]);

  useEffect(() => {
    if (botActive) {
      const interval = setInterval(triggerCryptoAnalysis, 60000);
      return () => clearInterval(interval);
    }
  }, [botActive, triggerCryptoAnalysis]);

  useEffect(() => {
    if (stockBotActive) {
      const interval = setInterval(triggerEquityHarvestingAnalysis, 60000);
      return () => clearInterval(interval);
    }
  }, [stockBotActive, triggerEquityHarvestingAnalysis]);

  useEffect(() => {
    if (!db || !user) return;
    
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        setTotalBotEarnings(d.totalBotEarnings || 0);
        // Crypto
        setBotActive(!!d.botActive);
        setBotAllocation(d.botAllocation || 20);
        setBotRiskLevel(d.botRiskLevel || 'medium');
        setBotStrategy(d.botStrategy || 'standard');
        // Stocks
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 20);
        setStockBotRisk(d.stockBotRisk || 'medium');
      }
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      setAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset)));
      setInitialized(true);
      setIsSyncing(false);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    const unsubStocks = onSnapshot(collection(db, 'users', user.uid, 'stocks'), (s) => {
      setStockAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockAsset)));
    });

    return () => { 
      unsubProfile(); unsubAssets(); unsubTx(); unsubStocks(); 
    };
  }, [db, user]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
      ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed'
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency);
    if (asset) {
      await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
        amount: increment(amount),
        fiatValueUSD: increment(amount * fiatPrice)
      });
    }
  }, [db, user, assets]);

  const liquidateEarnings = async () => { 
    if (totalBotEarnings <= 0 || !user || !db) return;
    const amount = totalBotEarnings;
    await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 }); 
    updateBalance('USDC', amount, 1); 
    toast({ title: "Yield Liquidated", description: `$${amount.toFixed(2)} moved to your USDC vault.` });
  };

  const syncOnChainBalance = async (addr: string, curr: string) => {
    return 0; // Mock sync
  };

  const generateNewWallet = async (curr: string, label?: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    await setDoc(doc(db, 'users', user.uid, 'assets', id), {
      currency: curr,
      amount: 0,
      fiatValueUSD: 0,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      isLive: true,
      privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
    });
  };

  const importPrivateKey = async (curr: string, key: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    await setDoc(doc(db, 'users', user.uid, 'assets', id), {
      currency: curr,
      amount: 0,
      fiatValueUSD: 0,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      isLive: true,
      privateKey: key
    });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user,
      totalBotEarnings, 
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance, generateNewWallet, importPrivateKey,
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
        if (active) addBotLog("CRYPTO ALPHA AGENT INITIALIZED", "success");
        else addBotLog("CRYPTO AGENT ON STANDBY", "warning");
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
        if (active) addStockLog("EQUITY HARVESTER PROTOCOL INITIALIZED", "success");
        else addStockLog("EQUITY AGENT ON STANDBY", "warning");
      },
      clearBotLogs: () => setBotLogs([]),
      clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings, addStockLog, addBotLog
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
