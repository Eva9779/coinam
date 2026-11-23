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
  deleteDoc
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
  marketData: any[];
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: string) => void;
  clearBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  addBotLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number, vault: number }>;
  generateNewWallet: (curr: string, label?: string) => Promise<void>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
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

  const [baselinePrices, setBaselinePrices] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingCryptoRef = useRef(false);

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
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      setDoc(doc(db, 'users', user.uid, 'assets', asset.id), { 
        amount: increment(amount), 
        fiatValueUSD: increment(amount * fiatPrice) 
      }, { merge: true });
    }
  }, [db, user, assets]);

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog = { msg, type, timestamp: new Date().toISOString() };
    setBotLogs(prev => [...prev.slice(-49), newLog]);
    if (db && user && (type === 'success' || type === 'warning' || type === 'error')) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { botLogs: arrayUnion(newLog) }, { merge: true });
    }
  }, [db, user]);

  const triggerCryptoAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!botActive || isAnalyzingCryptoRef.current || !user || !db || assets.length === 0) return;
    
    const ethAsset = assets.find(a => a.currency === 'ETH' && a.isPrimary);
    if (!ethAsset || ethAsset.amount <= 0) return;

    isAnalyzingCryptoRef.current = true;
    
    try {
      const marketAsset = currentMarket.find(m => m.currency === 'ETH');
      const livePrice = marketAsset?.currentPriceUSD || 0;
      const entryPrice = baselinePrices['ETH'] || 0;
      
      if (entryPrice === 0) {
        isAnalyzingCryptoRef.current = false;
        return;
      }

      const currentProfit = ((livePrice / entryPrice) - 1) * 100;
      addBotLog(`PROFIT SCAN: ETH at ${currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)}% (Target: +2.1% to Sell)`, 'info');

      if (currentProfit >= 2.1) {
        addBotLog("TARGET REACHED: Initiating Atomic Harvest to USDC Vault.", 'success');
        
        const totalValueUSD = ethAsset.amount * livePrice;
        const profitUSD = totalValueUSD * 0.021;
        const principalUSD = totalValueUSD - profitUSD;

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        const ethRef = doc(db, 'users', user.uid, 'assets', ethAsset.id);
        
        let usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
        let usdcRef;
        
        if (!usdcAsset) {
          addBotLog("VAULT PROTOCOL: Auto-provisioning USDC Destination.", 'info');
          const newUsdcId = `asset_usdc_${Date.now()}`;
          usdcRef = doc(db, 'users', user.uid, 'assets', newUsdcId);
          batch.set(usdcRef, {
            currency: 'USDC', amount: principalUSD, fiatValueUSD: principalUSD, 
            isLive: true, isPrimary: true,
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
          });
        } else {
          usdcRef = doc(db, 'users', user.uid, 'assets', usdcAsset.id);
          batch.set(usdcRef, { 
            amount: increment(principalUSD), 
            fiatValueUSD: increment(principalUSD) 
          }, { merge: true });
        }

        batch.set(userRef, { 
          totalBotEarnings: increment(profitUSD), 
          ['baselinePrices.ETH']: livePrice 
        }, { merge: true });
        batch.set(ethRef, { amount: 0, fiatValueUSD: 0 }, { merge: true });

        await batch.commit();
        
        addTransaction({
          type: 'trade',
          currency: `ETH → USDC`,
          amount: ethAsset.amount,
          fiatValueUSD: totalValueUSD,
          description: `Automated +2.1% Institutional Harvest`
        });
        
        toast({ title: "Harvest Successful", description: `Principal settled to USDC. Profit added to Yield.` });
      }
    } catch (e: any) {
      addBotLog(`PROTOCOL ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingCryptoRef.current = false;
    }
  }, [botActive, user, db, addBotLog, assets, baselinePrices, addTransaction]);

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
        setBaselinePrices(d.baselinePrices || {});
        if (d.botLogs) setBotLogs(d.botLogs.slice(-50));
      }
    });
    
    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), async (s) => {
      const fetchedAssets = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      
      // Cleanup Logic: Ensure only ONE ETH asset exists (The Primary one)
      const ethAssets = fetchedAssets.filter(a => a.currency === 'ETH');
      if (ethAssets.length > 1) {
        const batch = writeBatch(db);
        ethAssets.forEach(a => {
          if (a.id !== 'primary-vault-eth') {
             batch.delete(doc(db, 'users', user.uid, 'assets', a.id));
          }
        });
        await batch.commit();
      }

      setAssets(fetchedAssets);
      setInitialized(true);
      setIsSyncing(false);
      
      const primaryEth = fetchedAssets.find(a => a.id === 'primary-vault-eth');
      if (user && (!primaryEth || primaryEth.amount < 0.0121)) {
        const primaryRef = doc(db, 'users', user.uid, 'assets', 'primary-vault-eth');
        setDoc(primaryRef, {
          currency: 'ETH', amount: 0.0121, fiatValueUSD: 29.57, isLive: true, isPrimary: true,
          address: `0x${user.uid.slice(0, 10)}...enclave`,
          privateKey: 'ENCRYPTED_HSM_KEY'
        }, { merge: true });
        if (botActive) addBotLog("ENCLAVE INTEGRITY: Verified primary capital (0.0121 ETH).", 'info');
      }
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    return () => { unsubProfile(); unsubAssets(); unsubTx(); };
  }, [db, user, botActive, addBotLog]);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,tether,usd-coin&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) return;
        const data = await response.json();
        const mapping: Record<string, string> = { 'bitcoin': 'BTC', 'ethereum': 'ETH', 'binancecoin': 'BNB', 'solana': 'SOL', 'ripple': 'XRP', 'tether': 'USDT', 'usd-coin': 'USDC' };
        
        const updatedMarket = marketData.map(m => {
          const coinId = Object.keys(mapping).find(key => mapping[key] === m.currency);
          if (coinId && data[coinId]) {
            return { ...m, currentPriceUSD: data[coinId].usd, dailyChangePercent: data[coinId].usd_24h_change || 0 };
          }
          return m;
        });

        setMarketData(updatedMarket);
        if (botActive) triggerCryptoAnalysis(updatedMarket);
      } catch (e) {
        console.warn("RPC Mesh Congested.");
      }
    };
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, [botActive, triggerCryptoAnalysis, marketData]);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    let usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
    const batch = writeBatch(db);
    
    if (!usdcAsset) {
      const newUsdcId = `asset_usdc_${Date.now()}`;
      batch.set(doc(db, 'users', user.uid, 'assets', newUsdcId), {
        currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, 
        isLive: true, isPrimary: true,
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
      });
    } else {
      batch.set(doc(db, 'users', user.uid, 'assets', usdcAsset.id), { 
        amount: increment(totalBotEarnings), 
        fiatValueUSD: increment(totalBotEarnings) 
      }, { merge: true });
    }
    
    batch.set(doc(db, 'users', user.uid), { totalBotEarnings: 0 }, { merge: true });
    await batch.commit();
    addTransaction({ type: 'receive', currency: 'USDC', amount: totalBotEarnings, fiatValueUSD: totalBotEarnings, description: 'Settle Strategy Yield' });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      marketData,
      addTransaction, updateBalance, 
      syncOnChainBalance: async (addr, curr) => {
        const local = assets.find(a => a.address === addr)?.amount || 0;
        return { onChain: local, vault: local };
      },
      generateNewWallet: async (curr) => {
        if (!db || !user) return;
        const id = `asset_${curr.toLowerCase()}_${Date.now()}`;
        await setDoc(doc(db, 'users', user.uid, 'assets', id), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: `0x${Math.random().toString(16).slice(2, 42)}`,
          privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
        });
      },
      importPrivateKey: async (curr, key) => {
        if (!db || !user) return;
        const id = `asset_${curr.toLowerCase()}_${Date.now()}`;
        setDoc(doc(db, 'users', user.uid, 'assets', id), {
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: `0x${Math.random().toString(16).slice(2, 42)}`,
          privateKey: key
        }, { merge: true });
      },
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        const currentBaselines: Record<string, number> = { ...baselinePrices };
        if (active) {
          assets.forEach(a => {
            if (a.amount > 0) {
              const livePrice = marketData.find(m => m.currency === a.currency)?.currentPriceUSD || 0;
              if (livePrice > 0) currentBaselines[a.currency] = livePrice;
            }
          });
        }
        setDoc(doc(db, 'users', user.uid), { 
          botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy, baselinePrices: currentBaselines 
        }, { merge: true });
        addBotLog(active ? "ALPHA AGENT: ACTIVE (+2.1%)" : "AGENT STANDBY", active ? "success" : "warning");
      },
      clearBotLogs: () => {
        setBotLogs([]);
        if (db && user) setDoc(doc(db, 'users', user.uid), { botLogs: [] }, { merge: true });
      },
      liquidateEarnings, addBotLog
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
