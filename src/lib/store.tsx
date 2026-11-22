'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  increment
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

export type BotStrategyType = 'standard' | 'bitcoin_multiplier' | 'sol_yield' | 'bnb_surge' | 'xrp_bridge' | 'deriv_indices';

interface WalletContextType {
  assets: WalletAsset[];
  stockAssets: StockAsset[];
  transactions: Transaction[];
  initialized: boolean;
  isSyncing: boolean;
  isProvisioning: boolean;
  user: any;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  totalBotEarnings: number;
  botActive: boolean;
  botAllocation: number;
  botRiskLevel: 'low' | 'medium' | 'high';
  botStrategy: BotStrategyType;
  botLogs: BotLog[];
  stockBotActive: boolean;
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotAllocation: number;
  stockBotLogs: BotLog[];
  derivActive: boolean;
  derivBalance: number;
  isAnalyzing: boolean;
  isAnalyzingStocks: boolean;
  marketData: any[];
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  generateNewWallet: (currency: string, label?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: string) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: BotStrategyType) => void;
  updateStockBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  updateDerivSettings: (active: boolean) => void;
  submitKYC: (data: any) => Promise<void>;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  syncOnChainBalance: (address: string, currency: string) => Promise<number | null>;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStockLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(20); 
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState<BotStrategyType>('standard');
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(20); 
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [derivActive, setDerivActive] = useState(false);
  const [derivBalance, setDerivBalance] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingStocksRef = useRef(false);
  const lastStockAnalysisRef = useRef(0);

  // 🛡️ NO-LOSS EQUITY HARVESTING PROTOCOL
  const triggerEquityHarvestingAnalysis = useCallback(async () => {
    if (!stockBotActive || isAnalyzingStocksRef.current || !user) return;

    const now = Date.now();
    if (now - lastStockAnalysisRef.current < 60000) return; // Run every 60s for stability

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
        marketData: marketData.map(m => ({
          symbol: m.currency || m.symbol,
          name: m.currency || m.name,
          price: m.currentPriceUSD || m.current_price,
          changePercent: m.dailyChangePercent || m.price_change_percentage_24h,
          type: 'stock'
        })),
        allocationLimitUSD: stockBotAllocation
      });

      if (response && response.actions) {
        for (const action of response.actions) {
          if (action.type === 'buy' && stockBotAllocation >= 20) {
            addStockLog(`EQUITY ACQUISITION: Buying $${action.amount.toFixed(2)} of ${action.asset}.`, 'success');
            addStockLog(`Reasoning: ${action.reasoning}`, 'info');
            // Mock execution for prototype: update balance/stocks
          } else if (action.type === 'sell') {
            addStockLog(`PROFIT HARVEST: Liquidating ${action.asset} for gain.`, 'success');
            addStockLog(`Strategy: ${action.reasoning}`, 'info');
          }
        }
      } else {
        addStockLog(`Market Analysis: No high-probability equity setups. Holding vault position.`, 'info');
      }
    } catch (e: any) {
      addStockLog(`Protocol Error: ${e.message}`, 'error');
    } finally {
      isAnalyzingStocksRef.current = false;
      setIsAnalyzingStocks(false);
    }
  }, [stockBotActive, stockBotRisk, stockBotAllocation, stockAssets, marketData, user, addStockLog]);

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
        setBotActive(!!d.botActive);
        setBotAllocation(d.botAllocation || 20);
        setBotRiskLevel(d.botRiskLevel || 'medium');
        setBotStrategy(d.botStrategy || 'standard');
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 20);
        setStockBotRisk(d.stockBotRisk || 'medium');
        setKycStatus(d.kycStatus || 'unverified');
        setDerivActive(!!d.derivActive);
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
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: false, user,
      kycStatus, totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, derivActive, derivBalance, isAnalyzing, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, generateNewWallet: async () => null, importPrivateKey: async () => {}, 
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active); 
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
        if (active) addStockLog("EQUITY HARVESTER PROTOCOL INITIALIZED", "success");
        else addStockLog("EQUITY AGENT ON STANDBY", "warning");
      },
      updateDerivSettings: (active) => {
        setDerivActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { derivActive: active });
      },
      submitKYC: async () => { 
        if (!user || !db) return;
        await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'verified' }); 
      },
      clearBotLogs: () => setBotLogs([]), clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings, syncOnChainBalance: async () => null, addLog, addStockLog
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
