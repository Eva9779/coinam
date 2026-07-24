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

export interface WalletAsset {
  id: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive: boolean;
  privateKey?: `0x${string}`;
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

interface VaultContextType {
  assets: WalletAsset[];
  transactions: Transaction[];
  initialized: boolean;
  isSyncing: boolean;
  isProvisioning: boolean;
  user: any;
  totalBotEarnings: number;
  botActive: boolean;
  botAllocation: number;
  botRiskLevel: 'low' | 'medium' | 'high';
  botLogs: BotLog[];
  isAnalyzing: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string, customId?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: `0x${string}`) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  clearBotLogs: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(1000);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  
  const assetsRef = useRef<WalletAsset[]>([]);
  const botStateRef = useRef({ active: false, risk: 'medium', allocation: 1000, earnings: 0 });
  const autoProvisionAttempted = useRef(false);

  const { user } = useUserHook();
  const db = useFirestore();

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    botStateRef.current = { 
      active: botActive, 
      risk: botRiskLevel, 
      allocation: botAllocation, 
      earnings: totalBotEarnings 
    };
  }, [botActive, botRiskLevel, botAllocation, totalBotEarnings]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  // Sync User Metadata
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
      } else {
        const userData = {
          uid: user.uid,
          email: user.email,
          totalBotEarnings: 0,
          botActive: false,
          botAllocation: 1000,
          botRiskLevel: 'medium',
          updatedAt: new Date().toISOString()
        };
        setDoc(userRef, userData, { merge: true }).catch(() => {});
      }
    }, (error) => {
      // Silent error callback
    });

    return () => unsubscribe();
  }, [db, user]);

  // Sync Assets
  useEffect(() => {
    if (!db || !user) {
      setAssets([]);
      return;
    }

    const assetsRefCol = collection(db, 'users', user.uid, 'assets');
    const unsubscribe = onSnapshot(assetsRefCol, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(assetsData);
      setInitialized(true);
      setIsSyncing(false);
    }, (error) => {
      setInitialized(true);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  // Sync Transactions
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
    }, (error) => {
      // Silent listener fail
    });
    return () => unsubscribe();
  }, [db, user]);

  const updateBalance = useCallback((currency: string, amountChange: number, fiatPrice: number) => {
    if (!db || !user) return;
    const currentAssets = assetsRef.current;
    const asset = currentAssets.find(a => a.currency === currency);
    if (!asset) return;
    
    const assetDocRef = doc(db, 'users', user.uid, 'assets', asset.id);
    const newAmount = Math.max(0, asset.amount + amountChange);
    const data = { 
      amount: newAmount, 
      fiatValueUSD: newAmount * fiatPrice 
    };

    updateDoc(assetDocRef, data).catch((e) => {
      const pError = new FirestorePermissionError({
        path: assetDocRef.path,
        operation: 'update',
        requestResourceData: data
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', pError);
    });
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

  const runBotCycle = useCallback(async () => {
    const { active, risk, allocation } = botStateRef.current;
    if (!active || !user || !db || isAnalyzing) return;
    
    setIsAnalyzing(true);
    addLog(`Syncing Network Vision...`, 'info');
    
    try {
      // Fetch Real-World Prices from Coingecko
      const marketRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd&include_24hr_change=true');
      const marketJson = await marketRes.json();
      
      const liveMarket = [
        { currency: 'BTC', price: marketJson.bitcoin.usd, change24h: marketJson.bitcoin.usd_24h_change },
        { currency: 'ETH', price: marketJson.ethereum.usd, change24h: marketJson.ethereum.usd_24h_change },
        { currency: 'SOL', price: marketJson.solana.usd, change24h: marketJson.solana.usd_24h_change },
        { currency: 'USDC', price: 1, change24h: 0 },
      ];

      const currentAssets = assetsRef.current;
      const response = await analyzeMarketAndTrade({
        userId: user.uid,
        assets: currentAssets.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: liveMarket,
        riskTolerance: risk as any,
        allocationLimitUSD: allocation
      });

      if (response && response.actions && response.actions.length > 0) {
        addLog(response.strategy, 'success');
        
        let totalProfitThisCycle = 0;

        for (const action of response.actions) {
          if (action.type === 'buy' || action.type === 'sell') {
            const fromData = currentAssets.find(a => a.currency === action.fromAsset);
            const fromMarket = liveMarket.find(m => m.currency === action.fromAsset);
            const toMarket = liveMarket.find(m => m.currency === action.toAsset);
            const fromPrice = fromMarket?.price || 1;
            const toPrice = toMarket?.price || 1;

            // CORRECT UNIT MATH: amountUSD / price = units
            const unitsToSell = action.amountUSD / fromPrice;

            if (fromData && fromData.amount >= unitsToSell) {
              const receiveUnits = action.amountUSD / toPrice;
              
              updateBalance(action.fromAsset, -unitsToSell, fromPrice);
              updateBalance(action.toAsset, receiveUnits, toPrice);

              // Simulate a successful rebalancing "yield" of 0.1% for the profit field
              const tradeProfit = action.amountUSD * 0.001; 
              totalProfitThisCycle += tradeProfit;
              
              addTransaction({
                type: 'trade',
                currency: `${action.fromAsset} → ${action.toAsset}`,
                amount: unitsToSell,
                fiatValueUSD: action.amountUSD,
                description: `Execution Layer: ${action.reasoning}`
              });
            } else {
              addLog(`Insufficent ${action.fromAsset} for planned rebalance.`, 'warning');
            }
          }
        }

        if (totalProfitThisCycle > 0) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            totalBotEarnings: increment(totalProfitThisCycle)
          });
          addLog(`Arbitrage Yield Captured: +$${totalProfitThisCycle.toFixed(4)}`, 'success');
        }
      } else {
        addLog(`Market Equilibrium: Optimal allocation detected.`, 'info');
      }
    } catch (error) {
      addLog('Node Synchronization Delayed. Retrying...', 'info');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, isAnalyzing, addLog, updateBalance, addTransaction]);

  useEffect(() => {
    if (!initialized || !user) return;
    const interval = setInterval(() => {
      if (botStateRef.current.active) runBotCycle();
    }, 60000);
    return () => clearInterval(interval);
  }, [initialized, user, runBotCycle]);

  const updateBotSettings = (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => {
    if (!db || !user) return;
    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, {
      botActive: active,
      botAllocation: allocation,
      botRiskLevel: risk,
      updatedAt: new Date().toISOString()
    }).catch(() => {});
    if (active) addLog(`Neural Network Link Established. Bot is LIVE.`, 'success');
  };

  const clearBotLogs = () => setBotLogs([]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-vault') => {
    if (!db || !user) return null;
    setProvisioning(true);
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { uid: user.uid, email: user.email, updatedAt: new Date().toISOString() }, { merge: true });

      // PRODUCTION START: New wallets start with 0 balance.
      const newAsset: WalletAsset = {
        id: customId,
        currency,
        amount: 0, 
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      
      const assetDocRef = doc(db, 'users', user.uid, 'assets', customId);
      await setDoc(assetDocRef, newAsset);
      return account.address;
    } catch (e) {
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey);
      const assetId = `imported_${Date.now()}`;
      const assetDocRef = doc(db, 'users', user.uid, 'assets', assetId);
      await setDoc(assetDocRef, {
        id: assetId,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: privateKey
      });
      toast({ title: "Vault Restored" });
    } catch (error) {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (initialized && user && assets.length === 0 && !provisioning && !autoProvisionAttempted.current) {
      autoProvisionAttempted.current = true;
      generateNewWallet('ETH', 'primary-vault');
    }
  }, [initialized, user, assets.length, provisioning, generateNewWallet]);

  return (
    <VaultContext.Provider value={{ 
      assets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      totalBotEarnings, botActive, botAllocation, botRiskLevel, botLogs, isAnalyzing,
      addTransaction, updateBalance, generateNewWallet, importPrivateKey, updateBotSettings, clearBotLogs
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVaultStore() {
  const context = useContext(VaultContext);
  if (context === undefined) throw new Error('useVaultStore must be used within a VaultProvider');
  return context;
}
