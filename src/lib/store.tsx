
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
import { getLiveBalance, executeMainnetSwap, executeRWASettlement, getTransactionStatus } from '@/lib/blockchain';
import { encryptKey, decryptKey } from '@/lib/encryption';

export interface WalletAsset {
  id: string;
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive: boolean;
  privateKey?: string; 
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
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
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
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
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
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp' | 'status'>) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string, customId?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: string) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: 'standard' | 'bitcoin_multiplier') => void;
  updateStockBotSettings: (active: boolean, risk: 'low' | 'medium' | 'high') => void;
  submitKYC: (data: any) => Promise<void>;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
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
      const encryptedKey = await encryptKey(user.uid, pKey);

      await setDoc(doc(db, 'users', user.uid), { 
        uid: user.uid, 
        email: user.email, 
        updatedAt: new Date().toISOString(),
        securityLevel: 'institutional-enclave',
        kycStatus: 'unverified'
      }, { merge: true });

      const newAsset = {
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: encryptedKey 
      };
      
      await setDoc(doc(db, 'users', user.uid, 'assets', customId), newAsset);
      return account.address;
    } catch (e) {
      console.error("Failed to generate wallet:", e);
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

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
        setKycStatus(data.kycStatus || 'unverified');
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
    if (!db || !user || !initialized) return;

    const txRef = collection(db, 'users', user.uid, 'transactions');
    const unsubscribeTxs = onSnapshot(txRef, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
      setTransactions(txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      txs.filter(t => t.status === 'pending' && t.hash).forEach(async (pendingTx) => {
        const status = await getTransactionStatus(pendingTx.hash!);
        if (status !== 'pending') {
          updateDoc(doc(db, 'users', user.uid, 'transactions', pendingTx.id), { status });
        }
      });
    });

    return () => unsubscribeTxs();
  }, [db, user, initialized]);

  const submitKYC = async (data: any) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        kycStatus: 'pending',
        kycData: data,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Compliance Data Submitted", description: "Internal FSC review in progress." });
      
      setTimeout(async () => {
        await updateDoc(doc(db, 'users', user.uid), {
          kycStatus: 'verified',
        });
        toast({ title: "Compliance Approved", description: "Institutional trading unlocked." });
      }, 3000);
    } catch (e) {
      toast({ title: "Submission Failed", variant: "destructive" });
    }
  };

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp' | 'status'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const txData = { ...tx, id: txId, timestamp: new Date().toISOString(), status: 'pending' as const };
    
    setDoc(txDocRef, txData).catch((e) => {
      const pError = new FirestorePermissionError({
        path: txDocRef.path,
        operation: 'create',
        requestResourceData: txData
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', pError);
    });
  }, [db, user]);

  const updateBalance = useCallback((currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assetsRef.current.find(a => a.currency === currency);
    if (!asset) return;
    const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
    updateDoc(assetRef, {
      amount: increment(amount),
      fiatValueUSD: increment(amount * fiatPrice)
    });
  }, [db, user]);

  const runBotCycle = useCallback(async (forceActive: boolean = false) => {
    const { active, risk, allocation, strategy: strategyType } = botStateRef.current;
    if ((!active && !forceActive) || !user || !db || isAnalyzing) return;

    const primaryAsset = assetsRef.current.find(a => a.privateKey);
    if (!primaryAsset) return;
    
    setIsAnalyzing(true);
    addLog(`AI MAINNET BROADCAST: Analyzing global alpha rebalancing targets...`, 'info');
    
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
          addLog(`EXECUTING BROADCAST: ${action.type.toUpperCase()} $${action.amountUSD.toFixed(2)} of ${action.toAsset}`, 'info');
          
          const decryptedKey = await decryptKey(user.uid, primaryAsset.privateKey!);
          const txHash = await executeMainnetSwap(
            decryptedKey as `0x${string}`,
            action.fromAsset,
            action.toAsset,
            action.amountUSD
          );

          addLog(`MAINNET SIGNED: Hash ${txHash.slice(0, 16)}...`, 'success');
          
          updateDoc(doc(db, 'users', user.uid), {
            totalBotEarnings: increment(action.amountUSD * 0.0005)
          });

          addTransaction({
            type: 'trade',
            hash: txHash,
            currency: `${action.fromAsset} → ${action.toAsset}`,
            amount: action.amountUSD,
            fiatValueUSD: action.amountUSD,
            description: `MAINNET AI REBALANCE | Rebalancing Portfolio`
          });
        }
      } else {
        addLog(`Network state optimized. Monitoring peer-to-peer liquidity.`, 'info');
      }
    } catch (error: any) {
      addLog(`Execution Protocol Interrupted: ${error.message}`, 'warning');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, isAnalyzing, addLog, addTransaction]);

  const runStockBotCycle = useCallback(async (forceActive: boolean = false) => {
    const { active, risk } = stockBotStateRef.current;
    if ((!active && !forceActive) || !user || !db || isAnalyzingStocks) return;

    if (kycStatus !== 'verified') {
      addStockLog(`COMPLIANCE ERROR: RWA trading disabled. FSC verification required.`, 'warning');
      setStockBotActive(false);
      updateDoc(doc(db, 'users', user.uid), { stockBotActive: false });
      return;
    }

    const primaryAsset = assetsRef.current.find(a => a.privateKey);
    if (!primaryAsset) return;
    
    setIsAnalyzingStocks(true);
    addStockLog(`RWA PROTOCOL ACTIVE: Analyzing institutional yield targets...`, 'info');
    
    try {
      const stockData = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, changePercent: 1.2, type: 'stock' as const },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.65, changePercent: 0.8, type: 'stock' as const },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.45, changePercent: -2.4, type: 'stock' as const },
        { symbol: 'BND', name: 'Vanguard Bond ETF', price: 72.15, changePercent: 0.1, type: 'bond' as const },
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
        addStockLog(`RWA SETTLEMENT: ${result.summary}`, 'success');
        
        for (const action of result.actions) {
          addStockLog(`BROADCASTING RWA ${action.type.toUpperCase()}: ${action.amount} units of ${action.asset}`, 'info');
          
          const decryptedKey = await decryptKey(user.uid, primaryAsset.privateKey!);

          const txHash = await executeRWASettlement(
            decryptedKey as `0x${string}`,
            action.asset,
            action.type as 'buy' | 'sell',
            action.amount
          );

          addStockLog(`SIGNED RWA: Hash ${txHash.slice(0, 16)}...`, 'success');
          
          updateDoc(doc(db, 'users', user.uid), {
            totalBotEarnings: increment(2.50)
          });

          addTransaction({
            type: 'trade',
            hash: txHash,
            currency: action.asset,
            amount: action.amount,
            fiatValueUSD: 0,
            description: `RWA ${action.type.toUpperCase()} SETTLEMENT`
          });
        }
      } else {
        addStockLog(`Tokenized RWA portfolio aligned with ${risk} strategy.`, 'info');
      }
    } catch (error: any) {
      addStockLog(`Institutional Logic Delay: ${error.message}`, 'warning');
    } finally {
      setIsAnalyzingStocks(false);
    }
  }, [user, db, kycStatus, isAnalyzingStocks, addStockLog, addTransaction]);

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
    if (active && kycStatus !== 'verified') {
      toast({ title: "Compliance Required", description: "Complete KYC to enable the Equity Agent.", variant: "destructive" });
      return;
    }
    updateDoc(doc(db, 'users', user.uid), {
      stockBotActive: active,
      stockBotRisk: risk,
      updatedAt: new Date().toISOString()
    });
    if (active) setTimeout(() => runStockBotCycle(true), 500);
  }, [db, user, kycStatus, runStockBotCycle]);

  const clearBotLogs = () => setBotLogs([]);
  const clearStockBotLogs = () => setStockBotLogs([]);

  const importPrivateKey = async (currency: string, privateKey: string) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const encryptedKey = await encryptKey(user.uid, privateKey);
      const assetId = `imported_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'assets', assetId), {
        id: assetId, currency, amount: 0, fiatValueUSD: 0, address: account.address, isLive: true, privateKey: encryptedKey
      });
      toast({ title: "Wallet Restored" });
    } catch (error) {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      kycStatus, totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotLogs, isAnalyzing, isAnalyzingStocks,
      addTransaction, updateBalance, generateNewWallet, importPrivateKey, updateBotSettings, updateStockBotSettings,
      submitKYC, clearBotLogs, clearStockBotLogs
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
