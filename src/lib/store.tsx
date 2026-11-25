'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance } from '@/lib/blockchain';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  hash?: string;
}

interface UserBotConfig {
  address: string;
  encryptedJson: string;
  isActive: boolean;
  targetAsset: string;
  holding: 'ASSET' | 'USDC';
}

interface WalletContextType {
  assets: WalletAsset[];
  transactions: any[];
  initialized: boolean;
  isSyncing: boolean;
  user: any;
  totalBotEarnings: number;
  botConfig: UserBotConfig | null;
  botLogs: BotLog[];
  marketData: any[];
  liveBalances: { baseEth: number, mainnetEth: number, usdcBalance: number, ethPriceUsd: number };
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  updateBotSettings: (settings: Partial<UserBotConfig>) => void;
  clearBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [marketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [liveBalances, setLiveBalances] = useState({ baseEth: 0, mainnetEth: 0, usdcBalance: 0, ethPriceUsd: 0 });
  const [botConfig, setBotConfig] = useState<UserBotConfig | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser(auth);
  const db = useFirestore();

  const fetchLive = useCallback(async () => {
    if (!botConfig?.address) return;
    
    try {
      const res = await fetch(`/api/wallet-balance?address=${botConfig.address}`, { 
        cache: "no-store", 
        signal: AbortSignal.timeout(5000) 
      });
      if (res.ok) {
        const data = await res.json();
        setLiveBalances({
          baseEth: parseFloat(data.baseEth),
          mainnetEth: parseFloat(data.mainnetEth),
          usdcBalance: parseFloat(data.usdcBalance),
          ethPriceUsd: data.ethPriceUsd
        });
      }
    } catch (e) {}
  }, [botConfig?.address]);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  useEffect(() => {
    if (!db || !user) return;
    
    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(profileRef, (s) => {
      if (!s.exists()) return;
      const d = s.data();
      setTotalBotEarnings(d.totalBotEarnings || 0);
      setBotLogs(d.botLogs || []);
    });

    const botRef = doc(db, 'userBots', user.uid);
    const unsubBot = onSnapshot(botRef, (s) => {
      if (s.exists()) {
        setBotConfig(s.data() as UserBotConfig);
      }
    });

    const assetsRef = collection(db, 'users', user.uid, 'assets');
    const unsubAssets = onSnapshot(assetsRef, (s) => {
      const loaded = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(loaded);
      setInitialized(true);
    });

    const txRef = collection(db, 'users', user.uid, 'transactions');
    const unsubTx = onSnapshot(txRef, (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    return () => { unsubProfile(); unsubBot(); unsubAssets(); unsubTx(); };
  }, [db, user?.uid]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    const txData = { ...tx, id: txId, timestamp: new Date().toISOString(), status: tx.status || 'completed' };
    setDoc(txRef, txData, { merge: true }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: txRef.path, operation: 'write', requestResourceData: txData }));
    });
  }, [db, user?.uid]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
      const updateData = { amount: amount, fiatValueUSD: amount * fiatPrice };
      updateDoc(assetRef, updateData);
    }
  }, [db, user?.uid, assets]);

  const syncOnChainBalance = async (address: string, currency: string) => {
    if (!address) return { onChain: 0 };
    setIsSyncing(true);
    try {
      const live = await getLiveBalance(address, currency);
      const val = parseFloat(live);
      const asset = assets.find(a => a.address === address);
      if (asset) {
        const livePrice = marketData.find(m => m.currency === currency)?.currentPriceUSD || 1;
        const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
        updateDoc(assetRef, { amount: val, fiatValueUSD: val * livePrice });
      }
      return { onChain: val };
    } finally {
      setIsSyncing(false);
    }
  };

  const updateBotSettings = (settings: Partial<UserBotConfig>) => {
    if (user && db) {
      const botRef = doc(db, 'userBots', user.uid);
      updateDoc(botRef, settings);
    }
  };

  return (
    <WalletContext.Provider value={{ 
      assets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botConfig, botLogs, marketData, liveBalances, 
      addTransaction, updateBalance, syncOnChainBalance, updateBotSettings,
      clearBotLogs: () => {
        if(user && db) updateDoc(doc(db, 'users', user.uid), { botLogs: [] });
      },
      liquidateEarnings: async () => {
        if (!db || !user || totalBotEarnings <= 0) return;
        const profit = totalBotEarnings;
        updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
        addTransaction({ type: 'receive', currency: 'USDC', amount: profit, fiatValueUSD: profit, description: 'Yield Settlement' });
      }
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
