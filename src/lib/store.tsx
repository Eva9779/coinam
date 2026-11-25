'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance } from '@/lib/blockchain';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';

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
  hash?: string;
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
  runBotCycle: () => Promise<void>;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number }>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets] = useState<StockAsset[]>([
    { symbol: 'NVDA', name: 'NVIDIA Corp', shares: 0, avgPrice: 725.10, totalValue: 0 },
    { symbol: 'TQQQ', name: 'ProShares Ultra QQQ', shares: 0, avgPrice: 58.40, totalValue: 0 },
  ]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [marketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(20);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState('standard');

  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(20);
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser(auth);
  const db = useFirestore();

  useEffect(() => {
    if (!db || !user) return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (!s.exists()) return;
      const d = s.data();
      setTotalBotEarnings(d.totalBotEarnings || 0);
      setBotActive(!!d.botActive);
      setBotAllocation(d.botAllocation || 20);
      setBotRiskLevel(d.botRiskLevel || 'medium');
      setBotStrategy(d.botStrategy || 'standard');
      setBotLogs(d.botLogs || []);
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      setAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset)));
      setInitialized(true);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    return () => { unsubProfile(); unsubAssets(); unsubTx(); };
  }, [db, user?.uid]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    setDoc(txRef, { ...tx, id: txId, timestamp: new Date().toISOString(), status: tx.status || 'completed' }, { merge: true });
  }, [db, user?.uid]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), { 
        amount: amount, 
        fiatValueUSD: amount * fiatPrice 
      });
    }
  }, [db, user?.uid, assets]);

  const runBotCycle = async () => {
    if (!user || !botActive) return;
    setIsSyncing(true);
    try {
      const result = await analyzeMarketAndTrade({
        userId: user.uid,
        strategyType: botStrategy as any,
        assets: assets.map(a => ({ currency: a.currency, amount: a.amount, fiatValue: a.fiatValueUSD })),
        marketData: marketData.map(m => ({ currency: m.currency, price: m.currentPriceUSD, change24h: m.dailyChangePercent })),
        riskTolerance: botRiskLevel,
        allocationLimitUSD: botAllocation
      });

      if (result.txHash) {
        toast({ title: "Strategy Executed", description: `TX: ${result.txHash.slice(0, 10)}...` });
      } else if (result.error) {
        toast({ title: "Execution Delayed", description: result.error, variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const profitToAdd = totalBotEarnings;
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
    await batch.commit();
    addTransaction({ 
      type: 'receive', currency: 'USDC', amount: profitToAdd, fiatValueUSD: profitToAdd, 
      description: 'Yield Settlement'
    });
  };

  const syncOnChainBalance = async (address: string, currency: string) => {
    if (!address) return { onChain: 0 };
    setIsSyncing(true);
    try {
      const live = await getLiveBalance(address, currency);
      const val = parseFloat(live);
      return { onChain: val };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance, runBotCycle,
      importPrivateKey: async (curr, key) => {
        if (!db || !user) return;
        const assetId = `imported_${Date.now()}`;
        setDoc(doc(db, 'users', user.uid, 'assets', assetId), {
          id: assetId,
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: key, privateKey: key
        });
      },
      updateBotSettings: (active, alloc, risk, strat) => {
        setBotActive(active);
        if (user && db) updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: alloc, botRiskLevel: risk, botStrategy: strat });
      },
      updateStockBotSettings: (active, alloc, risk) => {
        setStockBotActive(active);
        if (user && db) updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: alloc, stockBotRisk: risk });
      },
      clearBotLogs: () => { if(user && db) updateDoc(doc(db, 'users', user.uid), { botLogs: [] }); },
      clearStockBotLogs: () => setStockBotLogs([]),
      liquidateEarnings
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
