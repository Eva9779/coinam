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

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

interface WalletContextType {
  assets: WalletAsset[];
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

  const addBotLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
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
  const marketDataRef = useRef(marketData);

  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  const [cryptoPositions, setCryptoPositions] = useState<any[]>([]);

  const triggerCryptoAnalysis = useCallback(async (currentMarket: any[]) => {
    if (!botActive || isAnalyzingCryptoRef.current || !user || !db) return;
    isAnalyzingCryptoRef.current = true;
    try {
      const profitTarget = 1.021; // +2.1%
      const dipThreshold = -1.5;   // -1.5%
      let harvestableFound = false;

      // PHASE 1: Scan Main Wallet Assets for +2.1% Gain
      for (const asset of assets) {
        if (asset.currency === 'USDC' || asset.amount <= 0) continue;
        
        const marketAsset = currentMarket.find(m => m.currency === asset.currency);
        const livePrice = marketAsset?.currentPriceUSD || 0;
        const entryPrice = baselinePrices[asset.currency];
        
        if (!entryPrice) {
          // If no baseline, initialize it now so we can track the next 2.1%
          const userRef = doc(db, 'users', user.uid);
          setDoc(userRef, { 
            baselinePrices: { ...baselinePrices, [asset.currency]: livePrice } 
          }, { merge: true });
          continue;
        }

        const currentProfit = ((livePrice / entryPrice) - 1) * 100;

        if (currentProfit >= 2.1) {
          const totalValue = asset.amount * livePrice;
          const profit = totalValue * 0.021; // Calculated harvested profit
          const principal = totalValue - profit;

          addBotLog(`WALLET HARVEST: ${asset.currency} reached +${currentProfit.toFixed(2)}%! Executing +2.1% Sell.`, 'success');
          toast({ title: "Strategy: Wallet Harvest", description: `Sold ${asset.amount.toFixed(4)} ${asset.currency} for $${profit.toFixed(2)} profit.` });

          const userRef = doc(db, 'users', user.uid);
          const usdcAsset = assets.find(a => a.currency === 'USDC' && a.isPrimary);
          const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
          
          // Execute Move to USDC
          if (usdcAsset) {
            const usdcRef = doc(db, 'users', user.uid, 'assets', usdcAsset.id);
            setDoc(usdcRef, { amount: increment(principal), fiatValueUSD: increment(principal) }, { merge: true });
          }

          setDoc(userRef, { 
            totalBotEarnings: increment(profit),
            [`baselinePrices.${asset.currency}`]: livePrice // Reset baseline for next run
          }, { merge: true });

          setDoc(assetRef, { amount: 0, fiatValueUSD: 0 }, { merge: true });
          
          addTransaction({
            type: 'trade',
            currency: `${asset.currency} → USDC`,
            amount: asset.amount,
            fiatValueUSD: totalValue,
            description: `Automated +2.1% Profit Harvest`
          });

          harvestableFound = true;
          break;
        } else {
           // Only log every few cycles to prevent spam, or if profit is significant
           if (currentProfit > 0) {
             addBotLog(`SCAN: ${asset.currency} Wallet Progress: +${currentProfit.toFixed(2)}% (Target: +2.1%)`, 'info');
           }
        }
      }

      // PHASE 2: Scan Bot Micro-Positions
      if (!harvestableFound) {
        for (const p of cryptoPositions) {
            const liveAsset = currentMarket.find(m => m.currency === p.currency);
            const livePrice = liveAsset ? liveAsset.currentPriceUSD : p.entryPrice;
            const targetPrice = p.entryPrice * profitTarget;
            const currentProgress = ((livePrice / p.entryPrice) - 1) * 100;

            if (livePrice >= targetPrice) {
                const profit = p.cost * 0.021;
                addBotLog(`HARVEST: +2.1% hit for ${p.currency} position! Settling yield.`, 'success');
                toast({ title: "Strategy: +2.1% Harvest", description: `Sold ${p.currency} position for $${profit.toFixed(4)} profit.` });
                
                const updatedPositions = cryptoPositions.filter(pos => pos.id !== p.id);
                const userRef = doc(db, 'users', user.uid);
                setDoc(userRef, { 
                  botAllocation: increment(p.cost),
                  totalBotEarnings: increment(profit),
                  cryptoPositions: updatedPositions
                }, { merge: true });

                setCryptoPositions(updatedPositions);
                harvestableFound = true;
                break; 
            }
        }
      }

      // PHASE 3: Dip Buying
      if (!harvestableFound && botAllocation >= 5.0 && cryptoPositions.length < 5) {
          const dipAsset = currentMarket.find(m => m.dailyChangePercent <= dipThreshold && !cryptoPositions.some(p => p.currency === m.currency));
          
          if (dipAsset) {
              const cost = 5.0;
              const entryPrice = dipAsset.currentPriceUSD;
              const newPos = { currency: dipAsset.currency, cost, entryPrice, id: Date.now() };
              
              addBotLog(`DIP BUY: ${dipAsset.currency} dropped ${dipAsset.dailyChangePercent.toFixed(2)}%. Buying dip @ $${entryPrice.toLocaleString()}.`, 'success');
              toast({ title: "Strategy: Dip Buy", description: `Acquired $5.00 of ${dipAsset.currency} @ $${entryPrice.toLocaleString()}.` });
              
              const updatedPositions = [...cryptoPositions, newPos];
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { 
                botAllocation: increment(-cost),
                cryptoPositions: updatedPositions
              }, { merge: true });
              setCryptoPositions(updatedPositions);
          } else {
            addBotLog(`ENCLAVE SCAN: Tracking mainnet momentum... (Target: +2.1%)`, 'info');
          }
      }

    } catch (e: any) {
      addBotLog(`ERROR: ${e.message}`, 'error');
    } finally {
      isAnalyzingCryptoRef.current = false;
    }
  }, [botActive, botAllocation, user, db, addBotLog, cryptoPositions, assets, baselinePrices]);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) return;
        const data = await response.json();
        
        const mapping: Record<string, string> = {
          'bitcoin': 'BTC', 'ethereum': 'ETH', 'binancecoin': 'BNB', 'solana': 'SOL', 'ripple': 'XRP'
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
          return updated;
        });
      } catch (e) {
        console.warn("Mainnet RPC limited. Retrying in 60s.");
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (botActive && marketData.length > 0) {
      triggerCryptoAnalysis(marketData);
    }
  }, [marketData, botActive, triggerCryptoAnalysis]);

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
        setCryptoPositions(d.cryptoPositions || []);
        setBaselinePrices(d.baselinePrices || {});
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

    return () => { 
      unsubProfile(); unsubAssets(); unsubTx(); 
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
      setDoc(assetRef, data, { merge: true });
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
    setDoc(assetRef, data);
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
    setDoc(assetRef, data);
  };

  return (
    <WalletContext.Provider value={{ 
      assets, transactions, initialized, isSyncing, user,
      totalBotEarnings,
      botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      marketData, addTransaction, updateBalance, 
      syncOnChainBalance, generateNewWallet, importPrivateKey,
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active);
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.uid);
        
        // Initialize baseline prices for all current non-zero assets when bot starts
        const currentBaselines: Record<string, number> = { ...baselinePrices };
        if (active) {
          assets.forEach(a => {
            if (a.amount > 0 && !currentBaselines[a.currency]) {
              const livePrice = marketData.find(m => m.currency === a.currency)?.currentPriceUSD || 0;
              if (livePrice > 0) currentBaselines[a.currency] = livePrice;
            }
          });
        }

        const data = { 
          botActive: active, 
          botAllocation: allocation, 
          botRiskLevel: risk, 
          botStrategy: strategy,
          baselinePrices: currentBaselines
        };
        
        setDoc(userRef, data, { merge: true });
        
        if (active) addBotLog("CRYPTO ALPHA AGENT: +2.1% TARGET ACTIVE", "success");
        else addBotLog("CRYPTO AGENT ON STANDBY", "warning");
      },
      clearBotLogs: () => setBotLogs([]),
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
