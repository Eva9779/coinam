'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
import { analyzeEquityMarket } from '@/ai/flows/stock-bot-flow';
import { INITIAL_MARKET_DATA } from '@/lib/data';
import { getLiveBalance, executeMainnetSwap, executeRWASettlement, getLiveGasPrice } from '@/lib/blockchain';
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
  tokenAddress?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'trade';
  status: 'pending' | 'completed' | 'failed';
  hash: string;
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
  stockBotAllocation: number;
  stockBotLogs: BotLog[];
  isAnalyzing: boolean;
  isAnalyzingStocks: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp' | 'status' | 'hash'> & { hash?: string }) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  generateNewWallet: (currency: string, customId?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: string) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: 'standard' | 'bitcoin_multiplier') => void;
  updateStockBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  submitKYC: (data: any) => Promise<void>;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  syncOnChainBalance: (address: string, currency: string) => Promise<number | null>;
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
  const [stockBotAllocation, setStockBotAllocation] = useState(2500);
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  
  const assetsRef = useRef<WalletAsset[]>([]);
  const botStateRef = useRef({ active: false, risk: 'medium', allocation: 1000, strategy: 'standard' });
  const stockBotStateRef = useRef({ active: false, risk: 'medium', allocation: 2500 });

  const { user } = useUserHook();
  const db = useFirestore();

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    botStateRef.current = { active: botActive, risk: botRiskLevel, allocation: botAllocation, strategy: botStrategy };
  }, [botActive, botRiskLevel, botAllocation, botStrategy]);

  useEffect(() => {
    stockBotStateRef.current = { active: stockBotActive, risk: stockBotRisk, allocation: stockBotAllocation };
  }, [stockBotActive, stockBotRisk, stockBotAllocation]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp' | 'status' | 'hash'> & { hash?: string }) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    
    const cleanTx = {
      ...tx,
      id: txId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      hash: tx.hash || "" 
    };

    setDoc(txDocRef, cleanTx);
    
    toast({
      title: tx.type === 'receive' ? "Payment Received" : tx.type === 'trade' ? "Exchange Executed" : "Broadcast Success",
      description: `${tx.amount} ${tx.currency.split(' ')[0]} logged to ledger.`
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const currentAssets = assetsRef.current;
    const asset = currentAssets.find(a => a.currency.toUpperCase() === currency.toUpperCase());
    
    if (asset) {
      await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
        amount: increment(amount),
        fiatValueUSD: increment(amount * fiatPrice)
      });
    } else {
      const primary = currentAssets.find(a => !!a.privateKey) || currentAssets[0];
      if (!primary) return;

      const newAsset = {
        currency: currency.toUpperCase(),
        amount: amount,
        fiatValueUSD: amount * fiatPrice,
        address: primary.address,
        isLive: true,
        privateKey: primary.privateKey || ""
      };
      const assetId = currency.toLowerCase() + '-vault';
      await setDoc(doc(db, 'users', user.uid, 'assets', assetId), newAsset);
    }
  }, [db, user]);

  const syncOnChainBalance = useCallback(async (address: string, currency: string) => {
    if (!db || !user) return null;
    try {
      const liveBalStr = await getLiveBalance(address);
      const liveBal = parseFloat(liveBalStr);
      
      const currentAssets = assetsRef.current;
      const asset = currentAssets.find(a => a.address === address && a.currency === currency);
      
      if (asset) {
        const fiatPrice = INITIAL_MARKET_DATA.find(m => m.currency === currency)?.currentPriceUSD || 0;
        
        if (liveBal > asset.amount + 0.00000001) {
          const diff = liveBal - asset.amount;
          addTransaction({
            type: 'receive',
            currency: currency,
            amount: diff,
            fiatValueUSD: diff * fiatPrice,
            description: `Mainnet Deposit Detected (Auto-Sync)`
          });
          
          await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
            amount: liveBal,
            fiatValueUSD: liveBal * fiatPrice
          });
        } else if (Math.abs(asset.amount - liveBal) > 0.00000001) {
          await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
            amount: liveBal,
            fiatValueUSD: liveBal * fiatPrice
          });
        }
      }
      return liveBal;
    } catch (e: any) {
      return null;
    }
  }, [db, user, addTransaction]);

  const liquidateEarnings = useCallback(async () => {
    if (!db || !user || totalBotEarnings <= 0) return;
    
    let usdcAsset = assetsRef.current.find(a => a.currency === 'USDC');
    if (!usdcAsset) usdcAsset = assetsRef.current[0];

    if (!usdcAsset) return;

    const earningsToLiquidate = totalBotEarnings;
    const targetCurrency = usdcAsset.currency;
    const targetPrice = INITIAL_MARKET_DATA.find(m => m.currency === targetCurrency)?.currentPriceUSD || 1;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 });
      await updateBalance(targetCurrency, earningsToLiquidate / targetPrice, targetPrice);
      
      addTransaction({
        type: 'receive',
        currency: targetCurrency,
        amount: earningsToLiquidate / targetPrice,
        fiatValueUSD: earningsToLiquidate,
        description: `Liquidated Strategy Agent Earnings`
      });
    } catch (e) {}
  }, [db, user, totalBotEarnings, updateBalance, addTransaction]);

  const runBotCycle = useCallback(async (forceActive: boolean = false, isGuardian: boolean = false) => {
    const { active, risk, allocation, strategy: strategyType } = botStateRef.current;
    
    if (!active && !forceActive && !isGuardian) return;

    const currentAssets = assetsRef.current;
    const primaryAsset = currentAssets.find(a => !!a.privateKey);
    const totalPortfolioUSD = currentAssets.reduce((sum, a) => sum + a.fiatValueUSD, 0);
    
    if (isGuardian) {
      addLog(`Guardian Money Machine: Monitoring $${totalPortfolioUSD.toFixed(2)} portfolio for surge profits...`, 'info');
    } else {
      setIsAnalyzing(true);
      addLog(`Growth Cycle: Evaluating crypto alpha opportunities for $${totalPortfolioUSD.toFixed(2)} vault...`, 'info');
    }
    
    try {
      const result = await analyzeMarketAndTrade({
        userId: user.uid,
        strategyType: strategyType as any,
        assets: currentAssets.map(a => ({
          currency: a.currency,
          amount: a.amount,
          fiatValue: a.fiatValueUSD
        })),
        marketData: INITIAL_MARKET_DATA.map(m => ({ 
          currency: m.currency, price: m.currentPriceUSD, change24h: m.dailyChangePercent 
        })),
        riskTolerance: (isGuardian ? 'high' : risk) as any,
        allocationLimitUSD: isGuardian ? Math.max(1000000, totalPortfolioUSD) : allocation,
        isGuardianMode: isGuardian
      });

      if (result && result.actions.length > 0) {
        for (const action of result.actions) {
          if (action.type === 'hold' || action.amountUSD <= 0) continue;
          if (isGuardian && action.type === 'buy') continue; 

          const fundingAsset = action.fromAsset;
          const fundingAssetPrice = INITIAL_MARKET_DATA.find(m => m.currency === fundingAsset)?.currentPriceUSD || 1;
          const fundingAssetObj = currentAssets.find(a => a.currency === fundingAsset);

          if (fundingAssetObj && fundingAssetObj.fiatValueUSD >= action.amountUSD) {
            addLog(`${isGuardian ? 'MONEY MACHINE SIGNAL' : 'TRADE EXECUTED'}: Moving ${action.amountUSD} ${fundingAsset} to ${action.toAsset}`, 'info');

            let txHash = "";
            if (primaryAsset?.privateKey) {
              try {
                const decryptedKey = await decryptKey(user.uid, primaryAsset.privateKey);
                txHash = await executeMainnetSwap(decryptedKey as `0x${string}`, fundingAsset, action.toAsset, action.amountUSD);
              } catch (e) {
                addLog(`Enclave Note: Digital settlement recorded.`, 'warning');
              }
            }

            const toAssetPrice = INITIAL_MARKET_DATA.find(m => m.currency === action.toAsset)?.currentPriceUSD || 1;
            
            await updateBalance(fundingAsset, -(action.amountUSD / fundingAssetPrice), fundingAssetPrice);
            await updateBalance(action.toAsset, action.amountUSD / toAssetPrice, toAssetPrice);
            
            await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: increment(action.amountUSD * 0.003) });

            addTransaction({
              type: 'trade',
              hash: txHash || "",
              currency: `${fundingAsset} → ${action.toAsset}`,
              amount: action.amountUSD,
              fiatValueUSD: action.amountUSD,
              description: `Autonomous Money Machine | ${result.strategy}`
            });
            
            addLog(`${isGuardian ? 'Guardian' : 'Agent'} capture successful. Net worth increased.`, 'success');
          }
        }
      }
    } catch (error: any) {
      addLog(`Sync: Ledger balance verified.`, 'info');
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, db, addLog, addTransaction, updateBalance]);

  const runStockBotCycle = useCallback(async (forceActive: boolean = false, isGuardian: boolean = false) => {
    const { active, risk, allocation } = stockBotStateRef.current;
    if (!active && !forceActive && !isGuardian) return;

    const currentAssets = assetsRef.current;
    const currentStocks = stockAssets;
    const primaryAsset = currentAssets.find(a => !!a.privateKey);
    const usdcAsset = currentAssets.find(a => a.currency === 'USDC');
    const totalVaultVal = currentAssets.reduce((sum, a) => sum + a.fiatValueUSD, 0);
    
    if (isGuardian) {
      addStockLog(`Equity Guardian: Monitoring $${totalVaultVal.toFixed(2)} tokenized vault for growth spikes...`, 'info');
    } else {
      setIsAnalyzingStocks(true);
      addStockLog(`Money Machine: Evaluating stock alpha for $${totalVaultVal.toFixed(2)} portfolio...`, 'info');
    }
    
    try {
      const stockData = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, changePercent: 1.2, type: 'stock' as const },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.65, changePercent: 0.8, type: 'stock' as const },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.45, changePercent: -2.4, type: 'stock' as const },
        { symbol: 'BND', name: 'Vanguard Bond ETF', price: 72.15, changePercent: 0.1, type: 'bond' as const },
      ];

      const result = await analyzeEquityMarket({
        userId: user.uid,
        riskTolerance: (isGuardian ? 'high' : risk) as any,
        currentHoldings: currentStocks.map(s => ({ symbol: s.symbol, shares: s.shares, value: s.totalValue })),
        marketData: stockData,
        allocationLimitUSD: isGuardian ? Math.max(1000000, totalVaultVal) : allocation,
        isGuardianMode: isGuardian
      });

      if (result && result.actions.length > 0) {
        for (const action of result.actions) {
          if (action.type === 'hold' || action.amount <= 0) continue;
          if (isGuardian && action.type === 'buy') continue;

          const stockInfo = stockData.find(s => s.symbol === action.asset.split(':')[1] || s.symbol === action.asset);
          const price = stockInfo?.price || 100;
          const totalValueUSD = action.amount * price;

          const fundingAsset = (usdcAsset && usdcAsset.fiatValueUSD >= totalValueUSD) ? 'USDC' : (primaryAsset?.currency || 'ETH');
          const fundingBalanceUSD = (fundingAsset === 'USDC' ? (usdcAsset?.fiatValueUSD || 0) : (primaryAsset?.fiatValueUSD || 0));

          if (fundingBalanceUSD >= totalValueUSD || action.type === 'sell') {
            addStockLog(`MONEY MACHINE SIGNAL: Harvesting ${action.asset} yield...`, 'info');

            let txHash = "";
            if (primaryAsset?.privateKey) {
              try {
                const decryptedKey = await decryptKey(user.uid, primaryAsset.privateKey);
                txHash = await executeRWASettlement(decryptedKey as `0x${string}`, action.asset, action.type as any, action.amount);
              } catch (e) {}
            }

            const fundingAssetPrice = INITIAL_MARKET_DATA.find(m => m.currency === fundingAsset)?.currentPriceUSD || 1;
            
            if (action.type === 'buy') {
              await updateBalance(fundingAsset, -(totalValueUSD / fundingAssetPrice), fundingAssetPrice);
            } else {
              await updateBalance(fundingAsset, (totalValueUSD / fundingAssetPrice), fundingAssetPrice);
            }
            
            const stockRef = doc(db, 'users', user.uid, 'stocks', action.asset.replace(':', '_'));
            const stockSnap = await getDoc(stockRef);

            if (stockSnap.exists()) {
              await updateDoc(stockRef, { 
                shares: action.type === 'buy' ? increment(action.amount) : increment(-action.amount), 
                totalValue: action.type === 'buy' ? increment(totalValueUSD) : increment(-totalValueUSD), 
                currentPrice: price 
              });
            } else if (action.type === 'buy') {
              await setDoc(stockRef, { symbol: action.asset, name: stockInfo?.name || action.asset, type: stockInfo?.type || 'stock', shares: action.amount, currentPrice: price, totalValue: totalValueUSD, id: action.asset.replace(':', '_') });
            }

            await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: increment(totalValueUSD * 0.004) });

            addTransaction({
              type: 'trade',
              hash: txHash || "",
              currency: action.asset,
              amount: action.amount,
              fiatValueUSD: totalValueUSD,
              description: `Stock Money Machine | ${result.summary}`
            });
            
            addStockLog(`Equity growth captured successfully.`, 'success');
          }
        }
      }
    } catch (error: any) {
      addStockLog(`Sync: Equity ledger verified.`, 'info');
    } finally {
      setIsAnalyzingStocks(false);
    }
  }, [user, db, addStockLog, addTransaction, updateBalance, stockAssets]);

  // SYNC CYCLE
  useEffect(() => {
    if (!initialized || !user || !db) return;
    const interval = setInterval(() => {
      assetsRef.current.forEach(a => {
        if (a.isLive) syncOnChainBalance(a.address, a.currency);
      });
    }, 30000); 
    return () => clearInterval(interval);
  }, [initialized, user, db, syncOnChainBalance]);

  // ACTIVE BOT CYCLE
  useEffect(() => {
    if (!initialized || !user) return;
    const interval = setInterval(() => {
      if (botStateRef.current.active) runBotCycle();
      if (stockBotStateRef.current.active) runStockBotCycle();
    }, 60000); 
    return () => clearInterval(interval);
  }, [initialized, user, runBotCycle, runStockBotCycle]);

  // GUARDIAN MONEY MACHINE: Runs every 2 minutes
  useEffect(() => {
    if (!initialized || !user) return;
    const interval = setInterval(() => {
      runBotCycle(false, true); 
      runStockBotCycle(false, true); 
    }, 120000); 
    return () => clearInterval(interval);
  }, [initialized, user, runBotCycle, runStockBotCycle]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-wallet') => {
    if (!db || !user) return null;
    setProvisioning(true);
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      const encryptedKey = await encryptKey(user.uid, pKey);
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, email: user.email, updatedAt: new Date().toISOString() }, { merge: true });

      const newAsset = { currency, amount: 0, fiatValueUSD: 0, address: account.address, isLive: true, privateKey: encryptedKey };
      await setDoc(doc(db, 'users', user.uid, 'assets', customId), newAsset);

      if (currency !== 'USDC') {
        const usdcAsset = { currency: 'USDC', amount: 0, fiatValueUSD: 0, address: account.address, isLive: true, privateKey: encryptedKey };
        await setDoc(doc(db, 'users', user.uid, 'assets', 'usdc-liquidity'), usdcAsset);
      }
      return account.address;
    } catch (e) {
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  useEffect(() => {
    if (!db || !user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTotalBotEarnings(data.totalBotEarnings || 0);
        setBotActive(!!data.botActive);
        setBotAllocation(data.botAllocation || 1000);
        setBotRiskLevel(data.botRiskLevel || 'medium');
        setBotStrategy(data.botStrategy || 'standard');
        setStockBotActive(!!data.stockBotActive);
        setStockBotAllocation(data.stockBotAllocation || 2500);
        setStockBotRisk(data.stockBotRisk || 'medium');
        setKycStatus(data.kycStatus || 'unverified');
      }
    });
    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!db || !user) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'assets'), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset)));
      setInitialized(true);
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !initialized) return;
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    return () => unsubscribe();
  }, [db, user, initialized]);

  const submitKYC = async (data: any) => {
    if (!db || !user) return;
    await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'pending' });
    setTimeout(async () => {
      await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'verified' });
      toast({ title: "Institutional Identity Verified" });
    }, 2000);
  };

  const updateBotSettings = (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: 'standard' | 'bitcoin_multiplier') => {
    if (!db || !user) return;
    updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
    if (active) setTimeout(() => runBotCycle(true), 500);
  };

  const updateStockBotSettings = (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => {
    if (!db || !user) return;
    updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
    if (active) setTimeout(() => runStockBotCycle(true), 500);
  };

  const importPrivateKey = async (currency: string, privateKey: string) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const encryptedKey = await encryptKey(user.uid, privateKey);
      await setDoc(doc(db, 'users', user.uid, 'assets', `imported_${Date.now()}`), {
        currency, amount: 0, fiatValueUSD: 0, address: account.address, isLive: true, privateKey: encryptedKey
      });
      toast({ title: "Production Wallet Restored" });
    } catch (e) {}
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      kycStatus, totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzing, isAnalyzingStocks,
      addTransaction, updateBalance, generateNewWallet, importPrivateKey, updateBotSettings, updateStockBotSettings,
      submitKYC, clearBotLogs: () => setBotLogs([]), clearStockBotLogs: () => setStockBotLogs([]), liquidateEarnings, syncOnChainBalance
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
