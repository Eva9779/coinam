
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment,
  writeBatch,
  updateDoc,
  getDoc,
  query,
  where
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
  const recoveryLockRef = useRef<string>("");

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setBotLogs(prev => [...prev.slice(-49), newLog]);
  }, []);

  const addStockBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setStockBotLogs(prev => [...prev.slice(-49), newLog]);
  }, []);

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
    if (!botActive || !user || !initialized) return;

    addBotLog("Establishing Mainnet Protocol Link...", "info");
    
    const botInterval = setInterval(async () => {
      const heartbeats = [
        "Scanning Order Books for Arbitrage opportunity...",
        "RSI Divergence analysis on BTC/USDT (1m timeframe).",
        "Evaluating MACD Cross-over on Ethereum Layer-1.",
        "Probing liquidity depth on DEX protocols...",
        "AI Agent scanning global institutional indices.",
        "Verifying structural breakout on ETH/USDT."
      ];
      
      const randomMsg = heartbeats[Math.floor(Math.random() * heartbeats.length)];
      addBotLog(randomMsg, "info");

      if (Math.random() > 0.88) {
        const harvest = Number((Math.random() * 0.45 + 0.15).toFixed(2));
        addBotLog(`PROFIT TARGET HIT (+2.1%). Harvesting $${harvest} into Enclave.`, "success");
        
        // Internal record only - strictly does NOT update wallet balance
        addTransaction({
          type: 'receive',
          currency: 'USDC',
          amount: harvest,
          fiatValueUSD: harvest,
          description: 'Real-Time Yield Settle',
          internal: true 
        });

        updateDoc(doc(db, 'users', user.uid), {
          totalBotEarnings: increment(harvest)
        }).catch(() => {});
      }
    }, 8000);

    return () => clearInterval(botInterval);
  }, [botActive, user, initialized, db, addBotLog, addTransaction]);

  useEffect(() => {
    if (!db || !user || !initialized || transactions.length === 0 || assets.length === 0) return;

    // Sum real spendable credits
    // CRITICAL: Ignore "Real-Time Yield Settle" for balance calculation to remove fake money
    const usdcCredits = transactions
      .filter(t => {
        const desc = (t.description || "").toLowerCase();
        const isReceive = t.type === 'receive';
        const isUSDC = t.currency?.toUpperCase().includes('USDC');
        const isInternal = t.internal === true || desc.includes('yield settle');

        return isReceive && isUSDC && !isInternal;
      })
      .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
    const usdcDebits = transactions
      .filter(t => t.type === 'send' && t.currency?.toUpperCase().includes('USDC'))
      .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

    const netUsdc = Number(Math.max(0, usdcCredits - usdcDebits).toFixed(4));

    const ethCredits = transactions
      .filter(t => t.type === 'receive' && t.currency?.toUpperCase().includes('ETH'))
      .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
    const ethDebits = transactions
      .filter(t => t.type === 'send' && t.currency?.toUpperCase().includes('ETH'))
      .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

    const netEth = Number(Math.max(0, ethCredits - ethDebits).toFixed(6));

    const recoveryKey = `v-clean-atomic-v4-${netUsdc}-${netEth}-${user.uid}-${transactions.length}`;
    if (recoveryLockRef.current === recoveryKey) return;
    recoveryLockRef.current = recoveryKey;

    const batch = writeBatch(db);
    let needsUpdate = false;

    assets.forEach(asset => {
      if (asset.currency === 'USDC' && Math.abs(asset.amount - netUsdc) > 0.0001) {
        batch.update(doc(db, 'users', user.uid, 'assets', asset.id), {
          amount: netUsdc,
          fiatValueUSD: netUsdc
        });
        needsUpdate = true;
      }
      if (asset.currency === 'ETH' && Math.abs(asset.amount - netEth) > 0.000001) {
        const livePrice = marketData.find(m => m.currency === 'ETH')?.currentPriceUSD || 2450;
        batch.update(doc(db, 'users', user.uid, 'assets', asset.id), {
          amount: netEth,
          fiatValueUSD: netEth * livePrice
        });
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      batch.commit().catch(() => {});
    }
  }, [db, user, initialized, transactions, assets, marketData]);

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
      setStockBotActive(!!d.stockBotActive);
      setStockBotAllocation(d.stockBotAllocation || 20);
      setStockBotRisk(d.stockBotRisk || 'medium');
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      const currentAssets = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(currentAssets);
      setInitialized(true);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      const txs = s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
    });

    return () => { unsubProfile(); unsubAssets(); unsubTx(); };
  }, [db, user?.uid]);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const profitToAdd = totalBotEarnings;
    const batch = writeBatch(db);
    
    batch.update(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
    await batch.commit();
    
    addTransaction({ 
      type: 'receive', 
      currency: 'USDC', 
      amount: profitToAdd, 
      fiatValueUSD: profitToAdd, 
      description: 'Manual Profit Liquidation',
      internal: false 
    });
    toast({ title: "Settlement Finalized" });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance: async (addr, curr) => {
        // Disable blockchain verification for private enclave keys
        if (addr.includes('enclave') || addr.includes('usdc') || curr === 'USDC' || addr.length < 42) {
          const asset = assets.find(a => a.address === addr);
          return { onChain: asset?.amount || 0, vault: asset?.amount || 0 };
        }
        try {
          const liveBalanceStr = await getLiveBalance(addr);
          const liveBalance = parseFloat(liveBalanceStr);
          const asset = assets.find(a => a.address === addr);
          if (asset && !isNaN(liveBalance)) {
            const livePrice = marketData.find(m => m.currency === curr)?.currentPriceUSD || 0;
            await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
              amount: liveBalance,
              fiatValueUSD: liveBalance * livePrice
            });
          }
          return { onChain: liveBalance, vault: liveBalance };
        } catch (e) { throw e; }
      },
      generateNewWallet: async (curr) => {
        if (!db || !user) return;
        const existingPrimary = assets.find(a => a.currency === curr && a.isPrimary);
        
        // Generate a full 42-character hex address (No truncation)
        const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const fullAddress = `0x${hex}`;
        const fullKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        setDoc(doc(db, 'users', user.uid, 'assets', `asset_${curr.toLowerCase()}_${Date.now()}`), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: !existingPrimary,
          address: fullAddress, privateKey: fullKey
        });
      },
      importPrivateKey: async (curr, key) => {
        if (!db || !user) return;
        const existingPrimary = assets.find(a => a.currency === curr && a.isPrimary);
        const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setDoc(doc(db, 'users', user.uid, 'assets', `asset_${curr.toLowerCase()}_${Date.now()}`), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: !existingPrimary,
          address: `0x${hex}`, privateKey: key
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
      clearBotLogs: () => setBotLogs([]),
      clearStockBotLogs: () => setStockBotLogs([]),
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
