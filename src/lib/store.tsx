'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc,
  increment
} from 'firebase/firestore';
import { analyzeMarketAndTrade } from '@/ai/flows/trading-bot-flow';
import { toast } from '@/hooks/use-toast';
import { INITIAL_MARKET_DATA } from './data';

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
  toAddress: string;
  fromAddress: string;
  description: string;
}

interface BotLog {
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export type BotStrategyType = 'standard' | 'bitcoin_multiplier' | 'sol_yield' | 'bnb_surge' | 'xrp_bridge' | 'deriv_indices';

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
  botStrategy: BotStrategyType;
  botLogs: BotLog[];
  stockBotActive: boolean;
  stockBotRisk: 'low' | 'medium' | 'high';
  stockBotAllocation: number;
  stockBotLogs: BotLog[];
  derivActive: boolean;
  derivBalance: number;
  isAnalyzing: boolean;
  isAnalyzingStocks: boolean;
  marketData: any[];
  addTransaction: (tx: any) => void;
  updateBalance: (currency: string, amount: number, fiatPrice: number) => Promise<void>;
  generateNewWallet: (currency: string, label?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: string) => Promise<void>;
  updateBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high', strategy: BotStrategyType) => void;
  updateStockBotSettings: (active: boolean, allocation: number, risk: 'low' | 'medium' | 'high') => void;
  updateDerivSettings: (active: boolean) => void;
  submitKYC: (data: any) => Promise<void>;
  clearBotLogs: () => void;
  clearStockBotLogs: () => void;
  liquidateEarnings: () => Promise<void>;
  syncOnChainBalance: (address: string, currency: string) => Promise<number | null>;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStockLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [stockBotLogs, setStockBotLogs] = useState<BotLog[]>([]);

  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const addStockLog = useCallback((msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setStockBotLogs(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toISOString() }]);
  }, []);

  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<any[]>(INITIAL_MARKET_DATA);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>('unverified');
  const [totalBotEarnings, setTotalBotEarnings] = useState(0);
  const [botActive, setBotActive] = useState(false);
  const [botAllocation, setBotAllocation] = useState(1);
  const [botRiskLevel, setBotRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [botStrategy, setBotStrategy] = useState<BotStrategyType>('standard');
  const [stockBotActive, setStockBotActive] = useState(false);
  const [stockBotAllocation, setStockBotAllocation] = useState(2500);
  const [stockBotRisk, setStockBotRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [derivActive, setDerivActive] = useState(false);
  const [derivBalance, setDerivBalance] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingStocks, setIsAnalyzingStocks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const { user } = useUserHook();
  const db = useFirestore();
  const derivSocketRef = useRef<WebSocket | null>(null);
  const tickStreamRef = useRef<number[]>([]);
  
  // LOGIC REFS to prevent infinite useEffect loops
  const isAnalyzingRef = useRef(false);
  const lastAnalysisTimeRef = useRef(0);
  const botActiveRef = useRef(false);
  const marketDataRef = useRef(marketData);
  const assetsRef = useRef(assets);
  const botStrategyRef = useRef(botStrategy);
  const botRiskLevelRef = useRef(botRiskLevel);
  const botAllocationRef = useRef(botAllocation);
  const derivBalanceRef = useRef(derivBalance);
  const [sessionStartingBalance, setSessionStartingBalance] = useState<number | null>(null);

  // Keep refs in sync with state for use inside stable callbacks
  useEffect(() => { botActiveRef.current = botActive; }, [botActive]);
  useEffect(() => { marketDataRef.current = marketData; }, [marketData]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { botStrategyRef.current = botStrategy; }, [botStrategy]);
  useEffect(() => { botRiskLevelRef.current = botRiskLevel; }, [botRiskLevel]);
  useEffect(() => { botAllocationRef.current = botAllocation; }, [botAllocation]);
  useEffect(() => { derivBalanceRef.current = derivBalance; }, [derivBalance]);

  const triggerAIAnalysis = useCallback(async () => {
    if (!botActiveRef.current) return;
    
    // Prevent overlapping analyses
    if (isAnalyzingRef.current) {
      return;
    }

    // Mandatory 15-second cooldown
    const now = Date.now();
    if (now - lastAnalysisTimeRef.current < 15000) {
       return;
    }

    if (!user || !db) {
      addLog("Analysis skipped: Identity context missing.", "warning");
      return;
    }

    if (derivBalanceRef.current <= 0) {
      addLog(`Analysis skipped: Real Balance is $${derivBalanceRef.current}.`, "warning");
      return;
    }

    if (derivSocketRef.current?.readyState !== WebSocket.OPEN) {
      addLog("Analysis skipped: Deriv bridge connection is closed.", "error");
      return;
    }

    if (tickStreamRef.current.length < 20) {
      return;
    }

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    lastAnalysisTimeRef.current = Date.now();

    addLog("AI Neural Link: Analyzing R_100 Tick Momentum...", "info");

    try {
      const contextData = marketDataRef.current.map((item: any) => ({
        currency: item.currency || item.symbol || '???',
        price: item.price ?? item.currentPriceUSD ?? item.current_price ?? 0,
        change24h: item.change24h ?? item.dailyChangePercent ?? item.price_change_percentage_24h ?? 0
      }));

      const result = await analyzeMarketAndTrade({
        userId: user.uid,
        strategyType: botStrategyRef.current,
        assets: assetsRef.current.map(a => ({ currency: a.currency, amount: a.amount, fiatValue: a.fiatValueUSD })),
        marketData: contextData,
        riskTolerance: botRiskLevelRef.current,
        allocationLimitUSD: botAllocationRef.current,
        tickStream: tickStreamRef.current,
      });

      if (!botActiveRef.current) return;

      if (result.actions && result.actions.length > 0) {
        let signalFound = false;
        const threshold = botRiskLevelRef.current === 'low' ? 80 : botRiskLevelRef.current === 'medium' ? 70 : 60;
        
        for (const action of result.actions) {
          if (action.type === 'buy' && action.contractType && botStrategyRef.current === 'deriv_indices') {
            signalFound = true;
            if (action.confidence >= threshold) {
              addLog(`ALPHA SIGNAL [${action.confidence}%]: Transmitting Fixed $1 Stake...`, 'info');
              derivSocketRef.current.send(JSON.stringify({
                buy: 1,
                price: 1,
                parameters: {
                  amount: 1,
                  basis: 'stake',
                  contract_type: action.contractType,
                  underlying_symbol: 'R_100',
                  currency: 'USD',
                  duration: 5,
                  duration_unit: 't'
                }
              }));
            } else {
              addLog(`Signal Filtered: Confidence (${action.confidence}%) below threshold (${threshold}%).`, "warning");
            }
          }
        }
        if (!signalFound) {
          addLog("Scanning for high-conviction breakout...", "info");
        }
      } else {
        addLog("Strategy Feed: Market Neutral.", "info");
      }
    } catch (e: any) {
      addLog(`AI PROCESSING EXCEPTION: ${e.message}`, 'error');
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [user, db, addLog]); // Stable dependencies

  useEffect(() => {
    if (derivActive && user && db) {
      const appId = '34ZRxvOFBnNAdQsr1T3bF';
      const token = 'pat_8c00afda6815eaf4c032b0e58194c67bf3e644128db301070f7a169903868298';
      
      const connectBridge = async () => {
        addLog(`Initializing Secure Bridge [AppID: ${appId}]...`, 'info');
        
        try {
          const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            headers: { 'Authorization': `Bearer ${token}`, 'Deriv-App-ID': appId }
          });

          const getJson = await accountsRes.json();
          const accountsArray = getJson.data || [];
          const realAcc = accountsArray.find((a: any) => a.account_type === 'real');
          
          let accountId = realAcc?.id || realAcc?.account_id;

          if (!accountId) {
            addLog(`REAL account not found. Provisioning...`, 'info');
            const createRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Deriv-App-ID': appId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ currency: 'USD', group: 'row', account_type: 'real' })
            });
            const postJson = await createRes.json();
            accountId = postJson.data?.id || postJson.data?.account_id || postJson.id || postJson.account_id;
          }

          if (!accountId) {
            addLog('Critical: Failed to resolve REAL account ID.', 'error');
            return;
          }

          addLog(`Requesting Dynamic Secure Link...`, 'info');
          const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Deriv-App-ID': appId }
          });

          const otpData = await otpResponse.json();
          const wsUrl = otpData.data?.url || otpData.url;

          if (!wsUrl) throw new Error('Security Protocol Error: No WebSocket URL returned.');

          addLog(`Establishing Hardware Handshake...`, 'success');
          const socket = new WebSocket(wsUrl);

          socket.onopen = () => {
            addLog('REAL Handshake secure. Initializing Live Subscriptions...', 'success');
            socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            socket.send(JSON.stringify({ ticks: 'R_100', subscribe: 1 }));
          };

          socket.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.error) {
              addLog(`Bridge Protocol Error: ${JSON.stringify(data.error)}`, 'error');
              return;
            }
            if (data.msg_type === 'tick') {
              const price = data.tick.quote;
              tickStreamRef.current = [...tickStreamRef.current.slice(-19), price];
              
              if (botActiveRef.current && tickStreamRef.current.length >= 20) {
                // Periodically log progress, but trigger AI based on ref logic
                if (tickStreamRef.current.length % 5 === 0) {
                   addLog(`Collecting ticks: ${tickStreamRef.current.length}/20`, 'info');
                }
                triggerAIAnalysis();
              }
            }
            if (data.msg_type === 'balance') {
              const currentBal = parseFloat(data.balance.balance);
              setDerivBalance(currentBal);
              
              if (sessionStartingBalance === null) {
                setSessionStartingBalance(currentBal);
              } else {
                const sessionPnL = currentBal - sessionStartingBalance;
                if (sessionPnL <= -3) {
                  addLog(`CIRCUIT BREAKER: Session loss threshold ($3) reached.`, 'error');
                  setBotActive(false);
                  updateDoc(doc(db, 'users', user.uid), { botActive: false });
                }
              }
            }
            if (data.msg_type === 'buy') {
              addLog(`ORDER BROADCAST RESULT: [ID: ${data.buy.contract_id || 'REJECTED'}]`, data.buy.contract_id ? 'success' : 'error');
              if (data.buy.contract_id) {
                toast({ title: "Order Accepted", description: `Contract ID: ${data.buy.contract_id}` });
              }
            }
          };

          derivSocketRef.current = socket;
        } catch (err: any) {
          addLog(`Bridge Provisioning Interrupted: ${err.message}`, 'error');
        }
      };

      connectBridge();
      return () => {
        if (derivSocketRef.current && derivSocketRef.current.readyState === WebSocket.OPEN) {
          derivSocketRef.current.close();
        }
      };
    }
  }, [derivActive, user, db, addLog, triggerAIAnalysis]); // Stable deps

  useEffect(() => {
    if (!db || !user) return;
    
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (s) => {
      if (s.exists()) {
        const d = s.data();
        setTotalBotEarnings(d.totalBotEarnings || 0);
        setBotActive(!!d.botActive);
        setBotAllocation(d.botAllocation || 1);
        setBotRiskLevel(d.botRiskLevel || 'medium');
        setBotStrategy(d.botStrategy || 'standard');
        setStockBotActive(!!d.stockBotActive);
        setStockBotAllocation(d.stockBotAllocation || 2500);
        setStockBotRisk(d.stockBotRisk || 'medium');
        setKycStatus(d.kycStatus || 'unverified');
        setDerivActive(!!d.derivActive);
      }
    });

    const unsubAssets = onSnapshot(collection(db, 'users', user.uid, 'assets'), (s) => {
      setAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as WalletAsset)));
      setInitialized(true);
      setIsSyncing(false);
    });

    const unsubTx = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (s) => {
      setTransactions(s.docs.map(d => ({ ...d.data(), id: d.id } as Transaction)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    const unsubStocks = onSnapshot(collection(db, 'users', user.uid, 'stocks'), (s) => {
      setStockAssets(s.docs.map(doc => ({ ...doc.data(), id: doc.id } as StockAsset)));
    });

    return () => { 
      unsubProfile(); 
      unsubAssets(); 
      unsubTx(); 
      unsubStocks(); 
    };
  }, [db, user]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
      ...tx, 
      id: txId, 
      timestamp: new Date().toISOString(), 
      status: 'completed'
    });
  }, [db, user]);

  const updateBalance = useCallback(async (currency: string, amount: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency);
    if (asset) {
      await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
        amount: increment(amount),
        fiatValueUSD: increment(amount * fiatPrice)
      });
    }
  }, [db, user, assets]);

  const liquidateEarnings = async () => { 
    if (totalBotEarnings <= 0 || !user || !db) return;
    await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 }); 
    updateBalance('USDC', totalBotEarnings, 1); 
  };

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: false, user,
      kycStatus, totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, derivActive, derivBalance, isAnalyzing, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, generateNewWallet: async () => null, importPrivateKey: async () => {}, 
      updateBotSettings: (active, allocation, risk, strategy) => {
        setBotActive(active); 
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
        if (!active) addLog("STRATEGY AGENT DEACTIVATED", "warning");
      },
      updateStockBotSettings: (active, allocation, risk) => {
        setStockBotActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
      },
      updateDerivSettings: (active) => {
        setDerivActive(active);
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { derivActive: active });
      },
      submitKYC: async () => { 
        if (!user || !db) return;
        await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'verified' }); 
      },
      clearBotLogs: () => setBotLogs([]), clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings, 
      syncOnChainBalance: async () => null, addLog, addStockLog
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
