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
  // HOISTED UTILITIES: Available to all hooks immediately
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
  const [marketData, setMarketData] = useState<any[]>([]);
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

  // PRODUCTION BRIDGE: Native App ID Integration
  useEffect(() => {
    if (derivActive && user && db) {
      const appId = '34ZRxvOFBnNAdQsr1T3bF'; // NATIVE APP ID
      const token = 'pat_8c00afda6815eaf4c032b0e58194c67bf3e644128db301070f7a169903868298';
      
      addLog(`Initializing Secure Bridge [Native AppID: ${appId}]...`, 'info');
      
      const socketUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${appId}`;
      let socket: WebSocket | null = null;
      let pingInterval: any;

      try {
        socket = new WebSocket(socketUrl);
        
        socket.onopen = () => {
          addLog('Handshake secure. Transmitting authorization...', 'info');
          socket?.send(JSON.stringify({ authorize: token }));
          
          pingInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ ping: 1 }));
            }
          }, 30000);
        };

        socket.onmessage = (msg) => {
          const data = JSON.parse(msg.data);
          
          if (data.error) {
            addLog(`Production Bridge Error: ${data.error.message}`, 'error');
            return;
          }

          if (data.msg_type === 'authorize') {
            addLog(`Identity Verified. Synchronizing Live Assets...`, 'success');
            socket?.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            socket?.send(JSON.stringify({ ticks: 'R_100', subscribe: 1 }));
          }

          if (data.msg_type === 'tick') {
            const price = data.tick.quote;
            tickStreamRef.current = [...tickStreamRef.current.slice(-19), price];
          }

          if (data.msg_type === 'balance') {
            setDerivBalance(parseFloat(data.balance.balance));
          }

          if (data.msg_type === 'buy') {
            addLog(`LIVE TRADE SUCCESS: Contract ID ${data.buy.contract_id}`, 'success');
            toast({ 
              title: "Trade Executed", 
              description: `Real-world order ${data.buy.contract_id} transmitted to Deriv.` 
            });
          }
        };

        socket.onerror = (err) => {
          addLog('Socket Error: Connection failed. Verify App Registration.', 'error');
        };

        socket.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          addLog(`Production Bridge Offline. Ensure your App ID is active in Deriv.`, 'warning');
        };

        derivSocketRef.current = socket;
      } catch (err) {
        addLog('Critical Connection Failure.', 'error');
      }

      return () => {
        if (socket && socket.readyState === WebSocket.OPEN) socket.close();
        if (pingInterval) clearInterval(pingInterval);
      };
    }
  }, [derivActive, user, db, addLog]);

  // LIVE EXECUTION LOOP: NO SIMULATION
  useEffect(() => {
    if (!botActive || !derivActive || !user || !db) return;

    const executionLoop = setInterval(async () => {
      if (derivSocketRef.current?.readyState !== WebSocket.OPEN) return;
      
      setIsAnalyzing(true);
      try {
        const result = await analyzeMarketAndTrade({
          userId: user.uid,
          strategyType: botStrategy,
          assets: assets.map(a => ({ currency: a.currency, amount: a.amount, fiatValue: a.fiatValueUSD })),
          marketData: marketData,
          riskTolerance: botRiskLevel,
          allocationLimitUSD: botAllocation,
          tickStream: tickStreamRef.current,
        });

        if (result.actions && result.actions.length > 0) {
          for (const action of result.actions) {
            if (action.type === 'buy' && action.contractType && botStrategy === 'deriv_indices') {
              if (action.confidence > 90) {
                addLog(`ALPHA SIGNAL: Transmitting real order to Deriv...`, 'info');
                derivSocketRef.current.send(JSON.stringify({
                  buy: 1,
                  price: botAllocation,
                  parameters: {
                    amount: botAllocation,
                    basis: 'stake',
                    contract_type: action.contractType,
                    currency: 'USD',
                    duration: 5,
                    duration_unit: 't',
                    symbol: 'R_100'
                  }
                }));
              }
            }
          }
        }
      } catch (e: any) {
        addLog(`Analysis Interrupted: ${e.message}`, 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }, 45000); 

    return () => clearInterval(executionLoop);
  }, [botActive, derivActive, botStrategy, botAllocation, botRiskLevel, user, db, assets, marketData, addLog]);

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
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
      },
      updateStockBotSettings: (active, allocation, risk) => {
        if (!user || !db) return;
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
      },
      updateDerivSettings: (active) => {
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
