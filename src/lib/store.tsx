'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { analyzeEquityMarket } from '@/ai/flows/stock-bot-flow';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';
import { getLiveBalance, TOKENS } from './blockchain';
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
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'bond';
  shares: number;
  currentPrice: number;
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
  addStockLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addBotLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  syncOnChainBalance: (addr: string, curr: string) => Promise<{ onChain: number, vault: number }>;
  generateNewWallet: (curr: string, label?: string) => Promise<void>;
  importPrivateKey: (curr: string, key: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
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
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  
  const isAnalyzingStocksRef = useRef(false);
  const isAnalyzingCryptoRef = useRef(false);

  const [cryptoPositions, setCryptoPositions] = useState<any[]>([]);
  const [equityPositions, setEquityPositions] = useState<any[]>([]);

  const triggerCryptoAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!botActive || isAnalyzingCryptoRef.current || !user || !db) return;
    isAnalyzingCryptoRef.current = true;
    try {
      addBotLog("MAINNET SCAN: Checking profit targets (+2.1%)...", "info");
      
      const profitTarget = 1.021;
      let harvestableFound = false;

      // 1. Check existing Bot-Opened Positions
      for (const p of cryptoPositions) {
          const liveAsset = currentMarket.find(m => m.currency === p.currency);
          const livePrice = liveAsset ? liveAsset.currentPriceUSD : p.entryPrice;
          const targetPrice = p.entryPrice * profitTarget;
          const progress = ((livePrice / p.entryPrice) - 1) * 100;

          if (livePrice >= targetPrice) {
              const profit = p.cost * 0.021;
              addBotLog(`HARVEST: +2.1% hit for ${p.currency}! Settling profit.`, 'success');
              toast({ title: "Strategy: +2.1% Harvest", description: `Captured $${profit.toFixed(4)} from ${p.currency}.` });
              
              const updatedPositions = cryptoPositions.filter(pos => pos.id !== p.id);
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { 
                botAllocation: increment(p.cost),
                totalBotEarnings: increment(profit),
                cryptoPositions: updatedPositions
              }, { merge: true }).catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'update',
                  requestResourceData: { totalBotEarnings: profit }
                }));
              });

              setCryptoPositions(updatedPositions);
              harvestableFound = true;
              break; 
          } else {
              addBotLog(`MONITOR: ${p.currency} at ${progress.toFixed(2)}% progress. Target: +2.1%`, 'info');
          }
      }

      // 2. If no harvest, look for Dip Entries (only if allocation allows)
      if (!harvestableFound && botAllocation >= 5.0 && cryptoPositions.length < 5) {
          const dipAsset = currentMarket.find(m => m.dailyChangePercent < -0.1 && !cryptoPositions.some(p => p.currency === m.currency));
          if (dipAsset) {
              const cost = 5.0;
              const entryPrice = dipAsset.currentPriceUSD;
              const newPos = { currency: dipAsset.currency, cost, entryPrice, id: Date.now() };
              
              addBotLog(`SIGNAL: Buying dip for ${dipAsset.currency} @ $${entryPrice.toLocaleString()}.`, 'success');
              toast({ title: "Strategy: Dip Buy", description: `Acquired $5.00 of ${dipAsset.currency} @ $${entryPrice.toLocaleString()}.` });
              
              const updatedPositions = [...cryptoPositions, newPos];
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { 
                botAllocation: increment(-cost),
                cryptoPositions: updatedPositions
              }, { merge: true }).catch(async () => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'update',
                  requestResourceData: { botAllocation: -cost }
                }));
              });
              setCryptoPositions(updatedPositions);
          }
      }

    } catch (e: any) {
      addBotLog(`ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingCryptoRef.current = false;
    }
  }, [botActive, botAllocation, user, db, addBotLog, cryptoPositions]);

  const triggerEquityHarvestingAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!stockBotActive || isAnalyzingStocksRef.current || !user || !db) return;
    isAnalyzingStocksRef.current = true;
    setIsAnalyzingStocks(true);

    try {
      addStockLog("VISION SCAN: Scanning equity yields (+2.1%)...", "info");
      
      const profitTarget = 1.021;
      let harvestableFound = false;

      for (const p of equityPositions) {
          const liveAsset = currentMarket.find(m => m.currency === p.symbol);
          const livePrice = liveAsset ? liveAsset.currentPriceUSD : p.entryPrice;
          const targetPrice = p.entryPrice * profitTarget;

          if (livePrice >= targetPrice) {
              const profit = p.cost * 0.021;
              addStockLog(`HARVEST: +2.1% reached for ${p.symbol}.`, 'success');
              toast({ title: "Equity: +2.1% Harvest", description: `Captured $${profit.toFixed(4)} from ${p.symbol}.` });
              
              const updatedPositions = equityPositions.filter(pos => pos.id !== p.id);
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { 
                stockBotAllocation: increment(p.cost),
                totalBotEarnings: increment(profit),
                equityPositions: updatedPositions
              }, { merge: true }).catch(async () => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'update',
                  requestResourceData: { totalBotEarnings: profit }
                }));
              });
              setEquityPositions(updatedPositions);
              harvestableFound = true;
              break;
          }
      }

      if (!harvestableFound && stockBotAllocation >= 5.0 && equityPositions.length < 5) {
          const techDip = currentMarket.find(m => ['NVDA', 'TQQQ', 'SOXL', 'NVD', 'SOX'].includes(m.currency) && m.dailyChangePercent < 0 && !equityPositions.some(p => p.symbol === m.currency));
          if (techDip) {
              const cost = 5.0;
              const entryPrice = techDip.currentPriceUSD;
              const newPos = { symbol: techDip.currency, cost, entryPrice, id: Date.now() };

              addStockLog(`DIP BUY: Allocated $5.00 to ${techDip.currency} @ $${entryPrice.toLocaleString()}.`, 'success');
              toast({ title: "Equity: Tech Dip Buy", description: `Acquired ${techDip.currency} via Enclave.` });
              
              const updatedPositions = [...equityPositions, newPos];
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { 
                stockBotAllocation: increment(-cost),
                equityPositions: updatedPositions
              }, { merge: true }).catch(async () => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'update',
                  requestResourceData: { stockBotAllocation: -cost }
                }));
              });
              setEquityPositions(updatedPositions);
          }
      }
    } catch (e: any) {
      addStockLog(`ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingStocksRef.current = false;
      setIsAnalyzingStocks(false);
    }
  }, [stockBotActive, stockBotAllocation, user, db, addStockLog, equityPositions]);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) return;
        const data = await response.json();
        
        const mapping: Record<string, string> = {
          'bitcoin': 'BTC',
          'ethereum': 'ETH',
          'binancecoin': 'BNB',
          'solana': 'SOL',
          'ripple': 'XRP'
        };

        setMarketData(prev => {
          const updated = prev.map(m => {
            const coinId = Object.keys(mapping).find(key => mapping[key] === m.currency);
            if (coinId && data[coinId]) {
              return {
                ...m,
                currentPriceUSD: data[coinId].usd,
                dailyChangePercent: data[coinId].usd_24h_change || 0
              };
            }
            return m;
          });
          
          if (botActive) triggerCryptoAnalysis(updated);
          if (stockBotActive) triggerEquityHarvestingAnalysis(updated);
          
          return updated;
        });
      } catch (e) {
        console.warn("Mainnet RPC limited. Retrying in 60s.");
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, [botActive, stockBotActive, triggerCryptoAnalysis, triggerEquityHarvestingAnalysis]);

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
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 20);
        setStockBotRisk(d.stockBotRisk || 'medium');
        setCryptoPositions(d.cryptoPositions || []);
        setEquityPositions(d.equityPositions || []);
      }
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      const currentDocs = s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset));
      setAssets(currentDocs);
      setInitialized(true);
      setIsSyncing(false);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    const unsubStocks = onSnapshot(collection(db, 'users', user.uid, 'stocks'), (s) => {
      setStockAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockAsset)));
    });

    return () => { 
      unsubProfile(); unsubAssets(); unsubTx(); unsubStocks(); 
    };
  }, [db, user]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, 'users', user.uid, 'transactions', txId);
    const data = { ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed' };
    setDoc(txRef, data).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency && a.isPrimary);
    if (asset) {
      const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
      const data = {
        amount: increment(amount),
        fiatValueUSD: increment(amount * fiatPrice)
      };
      setDoc(assetRef, data, { merge: true }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetRef.path,
          operation: 'update',
          requestResourceData: data
        }));
      });
    }
  }, [db, user, assets]);

  const liquidateEarnings = async () => { 
    if (!db || !user || totalBotEarnings <= 0) return;
    const usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
    if (!usdcAsset) {
      toast({ title: "Settlement Error", description: "Primary USDC Vault not found.", variant: "destructive" });
      return;
    }

    try {
      const assetRef = doc(db, 'users', user.uid, 'assets', usdcAsset.id);
      const userRef = doc(db, 'users', user.uid);

      setDoc(assetRef, {
        amount: increment(totalBotEarnings),
        fiatValueUSD: increment(totalBotEarnings)
      }, { merge: true });

      setDoc(userRef, { totalBotEarnings: 0 }, { merge: true });
      
      addTransaction({
        type: 'receive',
        currency: 'USDC',
        amount: totalBotEarnings,
        fiatValueUSD: totalBotEarnings,
        description: 'Settled Strategy Yield to Vault'
      });

      toast({ title: "Settlement Successful", description: `Liquidated $${totalBotEarnings.toFixed(2)} to your USDC Vault.` });
    } catch (e: any) {
      toast({ title: "Settlement Failed", description: e.message, variant: "destructive" });
    }
  };

  const syncOnChainBalance = async (addr: string, curr: string) => {
    try {
      const liveBalString = await getLiveBalance(addr);
      const liveBal = parseFloat(liveBalString);
      const asset = assets.find(a => a.address === addr);
      
      if (!isNaN(liveBal) && db && user && asset) {
          const livePrice = marketData.find(m => m.currency === curr)?.currentPriceUSD || 1;
          if (liveBal > 0) {
            const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
            setDoc(assetRef, {
              amount: liveBal,
              fiatValueUSD: liveBal * livePrice,
              isLive: true
            }, { merge: true });
          }
          return { onChain: liveBal, vault: asset.amount };
      }
      return { onChain: 0, vault: asset?.amount || 0 };
    } catch (e) {
      return { onChain: 0, vault: 0 };
    }
  };

  const generateNewWallet = async (curr: string, label?: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    const assetRef = doc(db, 'users', user.uid, 'assets', id);
    const data = {
      currency: curr,
      amount: 0,
      fiatValueUSD: 0,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      isLive: true,
      isPrimary: true,
      privateKey: `0x${Math.random().toString(16).slice(2, 66)}`
    };
    setDoc(assetRef, data).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  };

  const importPrivateKey = async (curr: string, key: string) => {
    if (!db || !user) return;
    const id = `asset_${Date.now()}`;
    const assetRef = doc(db, 'users', user.uid, 'assets', id);
    const data = {
      currency: curr,
      amount: 0,
      fiatValueUSD: 0,
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      isLive: true,
      isPrimary: true,
      privateKey: key
    };
    setDoc(assetRef, data).catch(async () => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, user,
      totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance, generateNewWallet, importPrivateKey,
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.uid);
        const data = { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy };
        setDoc(userRef, data, { merge: true }).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: data
          }));
        });
        if (active) addBotLog("CRYPTO ALPHA AGENT: +2.1% TARGET ACTIVE", "success");
        else addBotLog("CRYPTO AGENT ON STANDBY", "warning");
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.uid);
        const data = { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk };
        setDoc(userRef, data, { merge: true }).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: data
          }));
        });
        if (active) addStockLog("EQUITY HARVESTER: +2.1% TARGET ACTIVE", "success");
        else addStockLog("EQUITY AGENT ON STANDBY", "warning");
      },
      clearBotLogs: () => setBotLogs([]),
      clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings, addStockLog, addBotLog
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
