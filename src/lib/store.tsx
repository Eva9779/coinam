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
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance } from '@/lib/blockchain';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
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

interface WalletContextType {
  assets: WalletAsset[];
  transactions: any[];
  initialized: boolean;
  isSyncing: boolean;
  user: any;
  totalBotEarnings: number;
  botActive: boolean;
  botAddress: string | null;
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
  runBotCycle: () => Promise<void>;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number }>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [marketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  
  const [botActive, setBotActive] = useState(false);
  const [botAddress, setBotAddress] = useState<string | null>(null);
  const [botAllocation, setBotAllocation] = useState(20);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState('standard');

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser(auth);
  const db = useFirestore();

  useEffect(() => {
    if (!db || !user) return;
    
    // Sync User Profile
    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(profileRef, (s) => {
      if (!s.exists()) return;
      const d = s.data();
      setTotalBotEarnings(d.totalBotEarnings || 0);
      setBotActive(!!d.botActive);
      setBotAllocation(d.botAllocation || 20);
      setBotRiskLevel(d.botRiskLevel || 'medium');
      setBotStrategy(d.botStrategy || 'standard');
      setBotLogs(d.botLogs || []);
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: profileRef.path,
        operation: 'get',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    // Sync Bot Config (for Primary Address)
    const botRef = doc(db, 'userBots', user.uid);
    const unsubBot = onSnapshot(botRef, (s) => {
      if (s.exists()) {
        setBotAddress(s.data().address);
      }
    });

    // Sync Assets
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    const unsubAssets = onSnapshot(assetsRef, (s) => {
      const loaded = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(loaded);
      setInitialized(true);
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: assetsRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    // Sync Transactions
    const txRef = collection(db, 'users', user.uid, 'transactions');
    const unsubTx = onSnapshot(txRef, (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: txRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

    return () => { unsubProfile(); unsubBot(); unsubAssets(); unsubTx(); };
  }, [db, user?.uid]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    const txData = { ...tx, id: txId, timestamp: new Date().toISOString(), status: tx.status || 'completed' };
    setDoc(txRef, txData, { merge: true })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: txRef.path,
          operation: 'write',
          requestResourceData: txData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  }, [db, user?.uid]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
      const updateData = { 
        amount: amount, 
        fiatValueUSD: amount * fiatPrice 
      };
      updateDoc(assetRef, updateData)
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: assetRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
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
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, { totalBotEarnings: 0 })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { totalBotEarnings: 0 },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
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
      const asset = assets.find(a => a.address === address);
      if (asset && val !== asset.amount) {
        const livePrice = marketData.find(m => m.currency === currency)?.currentPriceUSD || 1;
        const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
        updateDoc(assetRef, { amount: val, fiatValueUSD: val * livePrice })
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: assetRef.path,
              operation: 'update',
              requestResourceData: { amount: val },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });
      }
      return { onChain: val };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <WalletContext.Provider value={{ 
      assets, transactions, initialized, isSyncing, user, totalBotEarnings,
      botActive, botAddress, botAllocation, botRiskLevel, botStrategy, botLogs,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance, runBotCycle,
      importPrivateKey: async (curr, key) => {
        if (!db || !user) return;
        const clean = key.trim();
        const assetId = `imported_${Date.now()}`;
        const isAddress = clean.startsWith('0x') && clean.length === 42;
        const assetRef = doc(db, 'users', user.uid, 'assets', assetId);
        const assetData = {
          id: assetId,
          currency: curr, amount: 0, fiatValueUSD: 0, isLive: true, isPrimary: true,
          address: clean, privateKey: isAddress ? null : clean
        };
        setDoc(assetRef, assetData)
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: assetRef.path,
              operation: 'create',
              requestResourceData: assetData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });
      },
      updateBotSettings: (active, alloc, risk, strat) => {
        setBotActive(active);
        if (user && db) {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, { botActive: active, botAllocation: alloc, botRiskLevel: risk, botStrategy: strat })
            .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { botActive: active },
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            });
        }
      },
      clearBotLogs: () => { 
        if(user && db) {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, { botLogs: [] })
            .catch(async (serverError) => {
              const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { botLogs: [] },
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            });
        }
      },
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
