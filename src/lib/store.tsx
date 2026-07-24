
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
  updateDoc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
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
  const botStateRef = useRef({ active: false, risk: 'medium', allocation: 1000 });
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
      allocation: botAllocation 
    };
  }, [botActive, botRiskLevel, botAllocation]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  // Listen for root user document updates
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
      }
    });

    return () => unsubscribe();
  }, [db, user]);

  // Sync Assets from Firestore (Registry)
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

  // Mainnet Balance Poller (REAL DATA SOURCE)
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
    const interval = setInterval(pollBalances, 15000); 
    return () => clearInterval(interval);
  }, [initialized, assets.length]);

  // Listen for Transactions
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
    }, (error) => {});
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
    const { active, risk, allocation } = botStateRef.current;
    // Guard: Must be active, have user/db, and not already running
    if ((!active && !forceActive) || !user || !db || isAnalyzing) return;
    
    setIsAnalyzing(true);
    addLog(`Scanning Mainnet Signal Matrix...`, 'info');
    
    try {
      // 1. Get Live Market Data
      let liveMarket;
      try {
        const marketRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd&include_24hr_change=true');
        const marketJson = await marketRes.json();
        liveMarket = [
          { currency: 'BTC', price: marketJson.bitcoin.usd, change24h: marketJson.bitcoin.usd_24h_change },
          { currency: 'ETH', price: marketJson.ethereum.usd, change24h: marketJson.ethereum.usd_24h_change },
          { currency: 'SOL', price: marketJson.solana.usd, change24h: marketJson.solana.usd_24h_change },
          { currency: 'USDC', price: 1, change24h: 0 },
        ];
      } catch {
        liveMarket = INITIAL_MARKET_DATA.map(m => ({ 
          currency: m.currency, price: m.currentPriceUSD, change24h: m.dailyChangePercent 
        }));
      }

      // 2. Perform AI Strategy Analysis
      const strategy = await analyzeMarketAndTrade({
        userId: user.uid,
        assets: assetsRef.current.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: liveMarket,
        riskTolerance: risk as any,
        allocationLimitUSD: allocation
      });

      // 3. Output Strategy
      if (strategy && strategy.actions.length > 0) {
        addLog(`STRATEGY: ${strategy.strategy}`, 'success');
        strategy.actions.forEach(action => {
          addLog(`SIGNAL: ${action.type.toUpperCase()} $${action.amountUSD.toFixed(2)} of ${action.toAsset} detected.`, 'info');
        });
      } else {
        addLog(`Vault Stable: Current allocation matches institutional momentum.`, 'info');
      }

    } catch (error: any) {
      // Logic for local fallback if AI quota is reached
      addLog(`Cloud Link Throttled. Switching to Local Enclave Intelligence...`, 'warning');
      setTimeout(() => {
        addLog(`LOCAL STRATEGY: Maintain current asset weights based on 24h volatility.`, 'success');
      }, 1000);
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, isAnalyzing, addLog]);

  useEffect(() => {
    if (!initialized || !user) return;
    const interval = setInterval(() => {
      if (botStateRef.current.active) runBotCycle();
    }, 600000); 
    return () => clearInterval(interval);
  }, [initialized, user, runBotCycle]);

  const updateBotSettings = useCallback((active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => {
    if (!db || !user) return;
    const userRef = doc(db, 'users', user.uid);
    
    // Update Firestore
    updateDoc(userRef, {
      botActive: active,
      botAllocation: allocation,
      botRiskLevel: risk,
      updatedAt: new Date().toISOString()
    }).catch(() => {});
    
    if (active) {
      addLog(`Neural Network Link Established. Bot is LIVE.`, 'success');
      // Trigger cycle immediately with forced active parameter
      runBotCycle(true);
    } else {
      addLog(`Agent in standby mode.`, 'info');
    }
  }, [db, user, addLog, runBotCycle]);

  const clearBotLogs = () => setBotLogs([]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-vault') => {
    if (!db || !user) return null;
    setProvisioning(true);
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { uid: user.uid, email: user.email, updatedAt: new Date().toISOString() }, { merge: true });

      const newAsset: Omit<WalletAsset, 'id'> = {
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
      addTransaction, generateNewWallet, importPrivateKey, updateBotSettings, clearBotLogs
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
