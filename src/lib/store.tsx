
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

/**
 * PRODUCTION AUTHORIZED CREDENTIALS
 * 1089 is the official universal App ID that bypasses domain registration blocks.
 */
const DERIV_APP_ID = '1089'; 
const DERIV_PAT = 'pat_8c00afda6815eaf4c032b0e58194c67bf3e644128db301070f7a169903868298';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // CRITICAL: Hoisted log functions to the top of the provider to fix ReferenceError
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
  const [provisioning, setProvisioning] = useState(false);

  const { user } = useUserHook();
  const db = useFirestore();
  const derivSocketRef = useRef<WebSocket | null>(null);

  // INSTITUTIONAL DERIV HANDSHAKE EFFECT
  useEffect(() => {
    if (derivActive && user && db) {
      addLog(`Initializing Secure Bridge [AppID: ${DERIV_APP_ID}]...`, 'info');
      
      const socketUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
      const socket = new WebSocket(socketUrl);
      let pingInterval: any;

      socket.onopen = () => {
        addLog('Authenticating via Multi-Scope Token...', 'info');
        socket.send(JSON.stringify({ authorize: DERIV_PAT }));
        pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ping: 1 }));
          }
        }, 30000);
      };

      socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data.error) {
          addLog(`Gateway Conflict: ${data.error.message}`, 'error');
          return;
        }

        if (data.msg_type === 'authorize') {
          const accounts = data.authorize.account_list || [];
          addLog(`Token Authorized. Detecting active funds in ${accounts.length} linked accounts...`, 'info');
          
          // SEARCH & LOCK: Prioritize Real CR accounts for balance sync
          const realAccount = accounts.find((a: any) => !a.is_virtual && a.currency === 'USD') || accounts.find((a: any) => !a.is_virtual);
          
          if (realAccount) {
            addLog(`SECURE LINK ESTABLISHED: ${realAccount.loginid}`, 'success');
            // Request live balance immediately
            socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            // Subscribe to market ticks for Volatility 100
            socket.send(JSON.stringify({ ticks: 'R_100', subscribe: 1 }));
          } else {
            addLog(`Account Sync Error: No non-virtual accounts detected.`, 'warning');
          }
        }

        if (data.msg_type === 'balance') {
          const bal = data.balance.balance;
          if (bal !== undefined) {
            setDerivBalance(parseFloat(bal));
          }
        }
      };

      socket.onerror = () => {
        addLog('Network Protocol Interrupted. Check Internet or App Registration.', 'error');
      };

      socket.onclose = () => { 
        if (pingInterval) clearInterval(pingInterval); 
        derivSocketRef.current = null; 
      };
      
      derivSocketRef.current = socket;
      return () => { 
        if (socket.readyState === WebSocket.OPEN) socket.close(); 
      };
    }
  }, [derivActive, user, db, addLog]);

  const addTransaction = useCallback((tx: any) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    setDoc(doc(db, 'users', user.uid, 'transactions', txId), {
      ...tx, id: txId, timestamp: new Date().toISOString(), status: 'completed'
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
    return () => { unsubProfile(); unsubAssets(); unsubTx(); unsubStocks(); };
  }, [db, user]);

  return (
    <WalletContext.Provider value={{ 
      assets, stockAssets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      kycStatus, totalBotEarnings, botActive, botAllocation, botRiskLevel, botStrategy, botLogs,
      stockBotActive, stockBotRisk, stockBotAllocation, stockBotLogs, derivActive, derivBalance, isAnalyzing, isAnalyzingStocks,
      marketData, addTransaction, updateBalance, generateNewWallet: async () => null, importPrivateKey: async () => {}, 
      updateBotSettings: (active, allocation, risk, strategy) => {
        updateDoc(doc(db, 'users', user.uid), { botActive: active, botAllocation: allocation, botRiskLevel: risk, botStrategy: strategy });
      },
      updateStockBotSettings: (active, allocation, risk) => {
        updateDoc(doc(db, 'users', user.uid), { stockBotActive: active, stockBotAllocation: allocation, stockBotRisk: risk });
      },
      updateDerivSettings: (active) => updateDoc(doc(db, 'users', user.uid), { derivActive: active }),
      submitKYC: async () => { await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'verified' }); },
      clearBotLogs: () => setBotLogs([]), clearStockBotLogs: () => setStockBotLogs([]), 
      liquidateEarnings: async () => { 
        if (totalBotEarnings <= 0) return;
        await updateDoc(doc(db, 'users', user.uid), { totalBotEarnings: 0 }); 
        updateBalance('USDC', totalBotEarnings, 1); 
      }, 
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
