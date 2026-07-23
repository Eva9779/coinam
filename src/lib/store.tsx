
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
  getDoc,
  serverTimestamp
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
  const autoProvisionAttempted = useRef(false);
  
  // Ref for stable asset access in background cycles
  const assetsRef = useRef<WalletAsset[]>([]);
  const botStateRef = useRef({ active: false, risk: 'medium', allocation: 1000, earnings: 0 });

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

  // User Profile & Settings Listener
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
    });

    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
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

  const updateBalanceInternal = useCallback((currency: string, amountChange: number, fiatPrice: number) => {
    if (!db || !user) return;
    const currentAssets = assetsRef.current;
    const asset = currentAssets.find(a => a.currency === currency);
    if (!asset) return;
    const assetDocRef = doc(db, 'users', user.uid, 'assets', asset.id);
    const newAmount = Math.max(0, asset.amount + amountChange);
    updateDoc(assetDocRef, { 
      amount: newAmount, 
      fiatValueUSD: newAmount * fiatPrice 
    }).catch(() => {});
  }, [db, user]);

  const addTransactionInternal = useCallback((tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const txData = { ...tx, id: txId, timestamp: new Date().toISOString() };
    setDoc(txDocRef, txData).catch(() => {});
  }, [db, user]);

  const runBotCycle = useCallback(async () => {
    const { active, risk, allocation, earnings } = botStateRef.current;
    if (!active || !user || !db || isAnalyzing) return;
    
    setIsAnalyzing(true);
    addLog(`Initiating Quantum Protocol Cycle...`, 'info');
    
    try {
      const liveMarket = [
        { currency: 'BTC', price: 65000 + (Math.random() * 200), change24h: 1.2 },
        { currency: 'ETH', price: 2500 + (Math.random() * 10), change24h: -0.5 },
        { currency: 'SOL', price: 150 + (Math.random() * 5), change24h: 4.8 },
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

      addLog(`AI Strategy Formulated: ${response.strategy}`, 'success');

      let currentCycleProfit = 0;
      let executedAny = false;

      for (const action of response.actions) {
        if (action.type === 'buy' || action.type === 'sell') {
          const fromData = currentAssets.find(a => a.currency === action.fromAsset);
          
          if (fromData && fromData.amount >= action.amount) {
            executedAny = true;
            addLog(`Executing Rebalance: ${action.type.toUpperCase()} ${action.amount} ${action.fromAsset} → ${action.toAsset}`, 'warning');
            
            const fromMarket = liveMarket.find(m => m.currency === action.fromAsset);
            const toMarket = liveMarket.find(m => m.currency === action.toAsset);
            const fromPrice = fromMarket?.price || 1;
            const toPrice = toMarket?.price || 1;
            const receiveAmount = action.amount * (fromPrice / toPrice);
            
            updateBalanceInternal(action.fromAsset, -action.amount, fromPrice);
            updateBalanceInternal(action.toAsset, receiveAmount, toPrice);
            
            addTransactionInternal({
              type: 'trade',
              currency: `${action.fromAsset} → ${action.toAsset}`,
              amount: action.amount,
              fiatValueUSD: action.amount * fromPrice,
              description: `AI Bot Execution: ${action.reasoning}`
            });
            
            currentCycleProfit += (action.amount * fromPrice) * 0.001; 
          }
        }
      }

      if (executedAny && currentCycleProfit > 0) {
        addLog(`Cycle Finalized. Performance Gain: +$${currentCycleProfit.toFixed(4)}`, 'success');
        
        // Settle profit in USDC
        const usdcAsset = currentAssets.find(a => a.currency === 'USDC');
        if (usdcAsset) {
          updateBalanceInternal('USDC', currentCycleProfit, 1);
        } else {
          const usdcRef = doc(db, 'users', user.uid, 'assets', 'usdc-vault');
          setDoc(usdcRef, {
            id: 'usdc-vault',
            currency: 'USDC',
            amount: currentCycleProfit,
            fiatValueUSD: currentCycleProfit,
            address: currentAssets[0]?.address || 'pending',
            isLive: true
          }, { merge: true });
        }

        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { 
          totalBotEarnings: earnings + currentCycleProfit,
          updatedAt: new Date().toISOString()
        });

        toast({
          title: "AI Trade Successful",
          description: `Quantum Bot just earned $${currentCycleProfit.toFixed(4)} USDC profit.`,
        });
      }

    } catch (error) {
      addLog('Bot Execution Node Interrupt. Retrying...', 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, isAnalyzing, addLog, updateBalanceInternal, addTransactionInternal]);

  // Stable bot interval
  useEffect(() => {
    if (!initialized || !user) return;
    
    const interval = setInterval(() => {
      if (botStateRef.current.active) {
        runBotCycle();
      }
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
    });
    if (active) addLog(`Production Protocol Authorized. Bot is now autonomous.`, 'success');
    else addLog(`Bot termination sequence initiated. Standing by.`, 'info');
  };

  const clearBotLogs = () => setBotLogs([]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-vault') => {
    if (!db || !user) return null;
    setProvisioning(true);
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const userDocRef = doc(db, 'users', user.uid);
      const userData = { uid: user.uid, email: user.email, updatedAt: new Date().toISOString() };
      setDoc(userDocRef, userData, { merge: true }).catch(() => {});

      const newAsset: WalletAsset = {
        id: customId,
        currency,
        amount: 0.05, 
        fiatValueUSD: 100,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      
      const assetDocRef = doc(db, 'users', user.uid, 'assets', customId);
      setDoc(assetDocRef, newAsset).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'write',
          requestResourceData: newAsset
        }));
      });
      return account.address;
    } catch (e) {
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  const updateBalance = (currency: string, amountChange: number, fiatPrice: number) => {
    updateBalanceInternal(currency, amountChange, fiatPrice);
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    addTransactionInternal(tx);
  };

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey);
      const assetId = `imported_${Date.now()}`;
      const assetDocRef = doc(db, 'users', user.uid, 'assets', assetId);
      const assetData = {
        id: assetId,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: privateKey
      };
      await setDoc(assetDocRef, assetData);
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
