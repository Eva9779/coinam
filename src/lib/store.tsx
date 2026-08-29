'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc,
  increment
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
import { analyzeEquityMarket } from '@/ai/flows/stock-bot-flow';
import { INITIAL_MARKET_DATA } from '@/lib/data';
import { getLiveBalance } from '@/lib/blockchain';

export interface WalletAsset {
  id: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive: boolean;
  privateKey?: `0x${string}`;
}

export interface StockAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'bond';
  shares: number;
  currentPrice: number;
  totalValue: number;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'trade';
  currency: string;
  amount: number;
  fiatValueUSD: number;
  timestamp: string;
  toAddress?: string;
  fromAddress?: string;
  description: string;
}

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
}

interface WalletContextType {
  assets: WalletAsset[];
  stockAssets: StockAsset[];
  transactions: Transaction[];
  initialized: boolean;
  isSyncing: boolean;
  isProvisioning: boolean;
  user: any;
  totalBotEarnings: number;
  botActive: boolean;
  botAllocation: number;
  botRiskLevel: 'low' | 'medium' | 'high';
  botStrategy: 'standard' | 'bitcoin_multiplier';
  botLogs: BotLog[];
  stockBotActive: boolean;
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotLogs: BotLog[];
  isAnalyzing: boolean;
  isAnalyzingStocks: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  generateNewWallet: (currency: string, customId?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: `0x${string}`) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: 'standard' | 'bitcoin_multiplier') => void;
  updateStockBotSettings: (active: boolean, risk: 'low' | 'medium' | 'high') => void;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(1000);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState<'standard' | 'bitcoin_multiplier'>('standard');
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  
  const assetsRef = useRef<WalletAsset[]>([]);
  const stockAssetsRef = useRef<StockAsset[]>([]);
  const botStateRef = useRef({ active: false, risk: 'medium', allocation: 1000, strategy: 'standard' });
  const stockBotStateRef = useRef({ active: false, risk: 'medium' });

  const { user } = useUserHook();
  const db = useFirestore();

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    stockAssetsRef.current = stockAssets;
  }, [stockAssets]);

  useEffect(() => {
    botStateRef.current = { 
      active: botActive, 
      risk: botRiskLevel, 
      allocation: botAllocation,
      strategy: botStrategy
    };
  }, [botActive, botRiskLevel, botAllocation, botStrategy]);

  useEffect(() => {
    stockBotStateRef.current = { active: stockBotActive, risk: stockBotRisk };
  }, [stockBotActive, stockBotRisk]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-wallet') => {
    if (!db || !user) return null;
    setProvisioning(true);
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, updatedAt: new Date().toISOString() }, { merge: true });
      const newAsset = {
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      await setDoc(doc(db, 'users', user.uid, 'assets', customId), newAsset);
      return account.address;
    } catch (e) {
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  useEffect(() => {
    if (initialized && user && assets.length === 0 && !provisioning) {
      generateNewWallet('ETH', 'primary-wallet');
    }
  }, [initialized, user, assets.length, provisioning, generateNewWallet]);

  useEffect(() => {
    if (!db || !user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTotalBotEarnings(data.totalBotEarnings || 0);
        setBotActive(!!data.botActive);
        setBotAllocation(data.botAllocation || 1000);
        setBotRiskLevel(data.botRiskLevel || 'medium');
        setBotStrategy(data.botStrategy || 'standard');
        setStockBotActive(!!data.stockBotActive);
        setStockBotRisk(data.stockBotRisk || 'medium');
      }
    });

    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!db || !user) {
      setAssets([]);
      setStockAssets([]);
      return;
    }

    const assetsRefCol = collection(db, 'users', user.uid, 'assets');
    const unsubscribeAssets = onSnapshot(assetsRefCol, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(assetsData);
      setInitialized(true);
      setIsSyncing(false);
    });

    const stocksRefCol = collection(db, 'users', user.uid, 'stocks');
    const unsubscribeStocks = onSnapshot(stocksRefCol, (snapshot) => {
      const stocksData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockAsset));
      setStockAssets(stocksData);
    });

    return () => {
      unsubscribeAssets();
      unsubscribeStocks();
    };
  }, [db, user]);

  useEffect(() => {
    if (!initialized || assets.length === 0) return;

    const pollBalances = async () => {
      const updatedAssets = await Promise.all(assetsRef.current.map(async (asset) => {
        try {
          const liveBalance = await getLiveBalance(asset.address);
          const balanceNum = parseFloat(liveBalance);
          const registryPrice = INITIAL_MARKET_DATA.find(m => m.currency === asset.currency)?.currentPriceUSD || 2500;
          
          return {
            ...asset,
            amount: balanceNum,
            fiatValueUSD: balanceNum * registryPrice
          };
        } catch (e) {
          return asset;
        }
      }));
      setAssets(updatedAssets);
    };

    pollBalances();
    const interval = setInterval(pollBalances, 60000); 
    return () => clearInterval(interval);
  }, [initialized, assets.length]);

  useEffect(() => {
    if (!db || !user) {
      setTransactions([]);
      return;
    }
    const txRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(txRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => doc.data() as Transaction);
      setTransactions(txData);
    });
    return () => unsubscribe();
  }, [db, user]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const txData = { ...tx, id: txId, timestamp: new Date().toISOString() };
    
    setDoc(txDocRef, txData).catch((e) => {
      const pError = new FirestorePermissionError({
        path: txDocRef.path,
        operation: 'create',
        requestResourceData: txData
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', pError);
    });
  }, [db, user]);

  const runBotCycle = useCallback(async (forceActive: boolean = false) => {
    const { active, risk, allocation, strategy: strategyType } = botStateRef.current;
    if ((!active && !forceActive) || !user || !db || isAnalyzing) return;

    const totalCryptoValue = assetsRef.current.reduce((acc, a) => acc + a.fiatValueUSD, 0);
    if (totalCryptoValue < 50) {
      addLog(`Insufficient Wallet Funds ($${totalCryptoValue.toFixed(2)}). Bot is standing by for deposits.`, 'warning');
      return;
    }
    
    setIsAnalyzing(true);
    addLog(`AI Analysis Active: Analyzing mainnet momentum for alpha rebalancing...`, 'info');
    
    try {
      const strategyResult = await analyzeMarketAndTrade({
        userId: user.uid,
        strategyType: strategyType as any,
        assets: assetsRef.current.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: INITIAL_MARKET_DATA.map(m => ({ 
          currency: m.currency, price: m.currentPriceUSD, change24h: m.dailyChangePercent 
        })),
        riskTolerance: risk as any,
        allocationLimitUSD: allocation
      });

      if (strategyResult && strategyResult.actions.length > 0) {
        addLog(`STRATEGY IDENTIFIED: ${strategyResult.strategy}`, 'success');
        for (const action of strategyResult.actions) {
          addLog(`${action.type.toUpperCase()} $${action.amountUSD.toFixed(2)} of ${action.toAsset}. ${action.reasoning}`, 'info');
          
          const simulatedProfit = action.amountUSD * 0.0005;
          updateDoc(doc(db, 'users', user.uid), {
            totalBotEarnings: increment(simulatedProfit)
          });
        }
      } else {
        addLog(`Institutional state optimized. Holding positions for current trend.`, 'info');
      }
    } catch (error: any) {
      addLog(`AI Session Interrupted: ${error.message}`, 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, isAnalyzing, addLog]);

  const runStockBotCycle = useCallback(async (forceActive: boolean = false) => {
    const { active, risk } = stockBotStateRef.current;
    if ((!active && !forceActive) || !user || !db || isAnalyzingStocks) return;
    
    const totalEquityValue = stockAssetsRef.current.reduce((acc, s) => acc + s.totalValue, 0);
    if (totalEquityValue < 100) {
      addStockLog(`Equity Portfolio Empty. Please provision stock assets for AI management.`, 'warning');
      return;
    }

    setIsAnalyzingStocks(true);
    addStockLog(`Equity Agent Active: Analyzing stocks & bonds for portfolio growth...`, 'info');
    
    try {
      const stockData = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, changePercent: 1.2, type: 'stock' as const },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.65, changePercent: 0.8, type: 'stock' as const },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.45, changePercent: -2.4, type: 'stock' as const },
        { symbol: 'BND', name: 'Vanguard Bond ETF', price: 72.15, changePercent: 0.1, type: 'bond' as const },
        { symbol: 'TRES', name: 'US 10Y Treasury', price: 98.40, changePercent: 0.05, type: 'bond' as const },
      ];

      const result = await analyzeEquityMarket({
        userId: user.uid,
        riskTolerance: risk as any,
        currentHoldings: stockAssetsRef.current.map(s => ({
          symbol: s.symbol,
          shares: s.shares,
          value: s.totalValue
        })),
        marketData: stockData
      });

      if (result && result.actions.length > 0) {
        addStockLog(`STRATEGY: ${result.summary}`, 'success');
        for (const action of result.actions) {
          addStockLog(`${action.type.toUpperCase()} ${action.amount} shares of ${action.asset}. ${action.reasoning}`, 'info');
          
          const simulatedGain = 1.25; 
          updateDoc(doc(db, 'users', user.uid), {
            totalBotEarnings: increment(simulatedGain)
          });
        }
      } else {
        addStockLog(`Portfolio aligned with ${risk} risk targets. Standing by.`, 'info');
      }
    } catch (error: any) {
      addStockLog(`Equity Logic Delay: ${error.message}`, 'warning');
    } finally {
      setIsAnalyzingStocks(false);
    }
  }, [user, db, isAnalyzingStocks, addStockLog]);

  useEffect(() => {
    if (!initialized || !user) return;
    const interval = setInterval(() => {
      if (botStateRef.current.active) runBotCycle();
      if (stockBotStateRef.current.active) runStockBotCycle();
    }, 600000); 
    return () => clearInterval(interval);
  }, [initialized, user, runBotCycle, runStockBotCycle]);

  const updateBotSettings = useCallback((active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: 'standard' | 'bitcoin_multiplier') => {
    if (!db || !user) return;
    updateDoc(doc(db, 'users', user.uid), {
      botActive: active,
      botAllocation: allocation,
      botRiskLevel: risk,
      botStrategy: strategy,
      updatedAt: new Date().toISOString()
    });
    if (active) setTimeout(() => runBotCycle(true), 500);
  }, [db, user, runBotCycle]);

  const updateStockBotSettings = useCallback((active: boolean, risk: 'low' | 'medium' | 'high') => {
    if (!db || !user) return;
    updateDoc(doc(db, 'users', user.uid), {
      stockBotActive: active,
      stockBotRisk: risk,
      updatedAt: new Date().toISOString()
    });
    if (active) setTimeout(() => runStockBotCycle(true), 500);
  }, [db, user, runStockBotCycle]);

  const clearBotLogs = () => setBotLogs([]);
  const clearStockBotLogs = () => setStockBotLogs([]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey);
      const assetId = `imported_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'assets', assetId), {
        id: assetId, currency, amount: 0, fiatValueUSD: 0, address: account.address, isLive: true, privateKey: privateKey
      });
      toast({ title: "Wallet Restored" });
    } catch (error) {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotLogs, isAnalyzing, isAnalyzingStocks,
      addTransaction, generateNewWallet, importPrivateKey, updateBotSettings, updateStockBotSettings,
      clearBotLogs, clearStockBotLogs
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletStore() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWalletStore must be used within a WalletProvider');
  return context;
}