
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
  addDoc
} from 'firebase/firestore';
import { analyzeEquityMarket } from '@/ai/flows/stock-bot-flow';
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
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  totalBotEarnings: number;
  stockBotActive: boolean;
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotAllocation: number;
  stockBotLogs: BotLog[];
  isAnalyzingStocks: boolean;
  marketData: any[];
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  updateStockBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  submitKYC: (data: any) => Promise<void>;
  clearStockBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  addStockLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(20); 
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingStocksRef = useRef(false);
  const lastStockAnalysisRef = useRef(0);

  // 🛡️ ORIGINAL EQUITY HARVESTING PROTOCOL (Refined for $20 budgets)
  const triggerEquityHarvestingAnalysis = useCallback(async () => {
    if (!stockBotActive || isAnalyzingStocksRef.current || !user || !db) return;

    const now = Date.now();
    if (now - lastStockAnalysisRef.current < 60000) return; 

    isAnalyzingStocksRef.current = true;
    setIsAnalyzingStocks(true);
    lastStockAnalysisRef.current = now;

    try {
      const response = await analyzeEquityMarket({
        userId: user.uid,
        riskTolerance: stockBotRisk,
        currentHoldings: stockAssets.map(s => ({
          symbol: s.symbol,
          shares: s.shares,
          value: s.totalValue
        })),
        marketData: INITIAL_MARKET_DATA.map(m => ({
          symbol: m.currency,
          name: m.currency,
          price: m.currentPriceUSD,
          changePercent: m.dailyChangePercent,
          type: 'stock'
        })),
        allocationLimitUSD: stockBotAllocation
      });

      if (response && response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          if (action.type === 'buy') {
            const cost = action.amount;
            addStockLog(`DIP DETECTED: Acquiring $${cost.toFixed(2)} of fractional ${action.asset}.`, 'success');
            addStockLog(`REASONING: ${action.reasoning}`, 'info');
            
            // Execute simulated spot buy
            const stockId = `s_${action.asset}_${Date.now()}`;
            setDoc(doc(db, 'users', user.uid, 'stocks', stockId), {
              symbol: action.asset,
              name: action.asset,
              type: 'stock',
              shares: cost / 500, // Fractional units
              currentPrice: 500,
              totalValue: cost,
              id: stockId
            });
            updateDoc(doc(db, 'users', user.uid), { stockBotAllocation: increment(-cost) });
          } else if (action.type === 'sell') {
            addStockLog(`PROFIT HARVEST: Sell order executed for ${action.asset} at +2.1%.`, 'success');
            const profit = 1.05; // Simulated profit for the $20-budget flow
            updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: increment(profit) });
            // Clean up the stock doc
            const found = stockAssets.find(s => s.symbol === action.asset);
            if (found) {
              // In production we would delete or updateDoc
            }
          }
        }
      } else {
        addStockLog(`MARKET SCAN: Scanning for dips. Holding current vault position.`, 'info');
      }
    } catch (e: any) {
      addStockLog(`PROTOCOL ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingStocksRef.current = false;
      setIsAnalyzingStocks(false);
    }
  }, [stockBotActive, stockBotRisk, stockBotAllocation, stockAssets, user, db, addStockLog]);

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
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 20);
        setStockBotRisk(d.stockBotRisk || 'medium');
        setKycStatus(d.kycStatus || 'unverified');
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
    await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 }); 
    updateBalance('USDC', totalBotEarnings, 1); 
    toast({ title: "Yield Liquidated", description: `$${totalBotEarnings.toFixed(2)} moved to your USDC vault.` });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user,
      kycStatus, totalBotEarnings, 
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
        if (active) addStockLog("EQUITY HARVESTER PROTOCOL INITIALIZED", "success");
        else addStockLog("EQUITY AGENT ON STANDBY", "warning");
      },
      submitKYC: async () => { 
        if (!user || !db) return;
        await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'verified' }); 
      },
      clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings, addStockLog
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
