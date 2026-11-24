'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment,
  arrayUnion,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance } from '@/lib/blockchain';

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

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser(auth);
  const db = useFirestore();

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!db || !user) return;
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setBotLogs(prev => [...prev.slice(-49), newLog]);
  }, [db, user?.uid]);

  const addStockBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!db || !user) return;
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setStockBotLogs(prev => [...prev.slice(-49), newLog]);
  }, [db, user?.uid]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    setDoc(txRef, { ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed' }, { merge: true });
  }, [db, user?.uid]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), { 
        amount: increment(amount), 
        fiatValueUSD: increment(amount * fiatPrice) 
      }).catch(() => {});
    }
  }, [db, user?.uid, assets]);

  useEffect(() => {
    if (!db || !user) {
      setAssets([]);
      setTransactions([]);
      setBotLogs([]);
      setTotalBotEarnings(0);
      setBotActive(false);
      setInitialized(false);
      return;
    }
    
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (!s.exists()) return;
      const d = s.data();
      // Use state checks to prevent infinite re-render loops
      setTotalBotEarnings(prev => prev !== d.totalBotEarnings ? (d.totalBotEarnings || 0) : prev);
      setBotActive(prev => prev !== !!d.botActive ? !!d.botActive : prev);
      setBotAllocation(prev => prev !== d.botAllocation ? (d.botAllocation || 20) : prev);
      setBotRiskLevel(prev => prev !== d.botRiskLevel ? (d.botRiskLevel || 'medium') : prev);
      setBotStrategy(prev => prev !== d.botStrategy ? (d.botStrategy || 'standard') : prev);
      setStockBotActive(prev => prev !== !!d.stockBotActive ? !!d.stockBotActive : prev);
      setStockBotAllocation(prev => prev !== d.stockBotAllocation ? (d.stockBotAllocation || 20) : prev);
      setStockBotRisk(prev => prev !== d.stockBotRisk ? (d.stockBotRisk || 'medium') : prev);
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      const currentAssets = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      // Filter out ghost assets from UI to ensure production precision
      const realAssets = currentAssets.filter(a => !a.address.includes('...enclave') || a.amount > 0);
      setAssets(realAssets);
      setInitialized(true);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      const txs = s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
    });

    return () => { 
      unsubProfile(); 
      unsubAssets(); 
      unsubTx(); 
    };
  }, [db, user?.uid]);

  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      setMarketData(prev => prev.map(m => ({
        ...m,
        currentPriceUSD: m.currentPriceUSD * (1 + (Math.random() * 0.0002 - 0.0001))
      })));
    }, 10000);
    return () => clearInterval(heartbeatInterval);
  }, []);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
    const batch = writeBatch(db);
    if (!usdcAsset) {
      batch.set(doc(db, 'users', user.uid, 'assets', 'primary-vault-usdc'), {
        currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, isLive: true, isPrimary: true,
        address: `0x${user.uid.slice(0, 10)}...usdc`, privateKey: `PROD_SECURE_ENCLAVE_KEY`
      });
    } else {
      batch.update(doc(db, 'users', user.uid, 'assets', usdcAsset.id), { amount: increment(totalBotEarnings), fiatValueUSD: increment(totalBotEarnings) });
    }
    batch.update(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
    await batch.commit();
    addTransaction({ type: 'receive', currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, description: 'Direct Profit Liquidation' });
    toast({ title: "Settlement Finalized" });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance: async (addr, curr) => {
        if (!db || !user) return { onChain: 0, vault: 0 };
        try {
          const liveBalanceStr = await getLiveBalance(addr);
          const liveBalance = parseFloat(liveBalanceStr);
          const asset = assets.find(a => a.address === addr);
          if (asset) {
            const livePrice = marketData.find(m => m.currency === curr)?.currentPriceUSD || 0;
            await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
              amount: liveBalance,
              fiatValueUSD: liveBalance * livePrice
            });
          }
          return { onChain: liveBalance, vault: liveBalance };
        } catch (e) {
          console.error("Mainnet RPC sync failed", e);
          throw e;
        }
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
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
      },
      clearBotLogs: () => {
        setBotLogs([]);
      },
      clearStockBotLogs: () => {
        setStockBotLogs([]);
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
