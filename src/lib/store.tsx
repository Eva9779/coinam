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

// Technical Analysis Helpers
function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data: number[], period: number = 14): number {
  if (data.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

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
  
  const isAnalyzingRef = useRef(false);
  const lastAnalysisTimeRef = useRef(0);
  const botActiveRef = useRef(false);
  const derivBalanceRef = useRef(0);
  const [sessionStartingBalance, setSessionStartingBalance] = useState<number | null>(null);

  useEffect(() => { botActiveRef.current = botActive; }, [botActive]);
  useEffect(() => { derivBalanceRef.current = derivBalance; }, [derivBalance]);

  const triggerMathematicalAnalysis = useCallback(async () => {
    if (!botActiveRef.current || isAnalyzingRef.current) return;

    const now = Date.now();
    if (now - lastAnalysisTimeRef.current < 15000) return;

    if (tickStreamRef.current.length < 50) {
      addLog(`Collecting ticks: ${tickStreamRef.current.length}/50...`, 'info');
      return;
    }

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    lastAnalysisTimeRef.current = now;

    try {
      const prices = tickStreamRef.current;
      const ema9 = calculateEMA(prices, 9);
      const ema21 = calculateEMA(prices, 21);
      const rsi = calculateRSI(prices, 14);
      const currentPrice = prices[prices.length - 1];
      
      // Trend Exhaustion Shield
      const maxPrice = Math.max(...prices.slice(-50));
      const minPrice = Math.min(...prices.slice(-50));
      const isAtPeak = currentPrice >= maxPrice;
      const isAtValley = currentPrice <= minPrice;

      let action: 'CALL' | 'PUT' | null = null;
      let reason = '';

      // Tighter RSI Zones for Gold: CALL (50-65), PUT (35-50) to avoid "buying the top"
      if (ema9 > ema21 && rsi >= 50 && rsi <= 65 && !isAtPeak) {
        action = 'CALL';
        reason = `Bullish Momentum: EMA9 Cross + RSI Pullback (${rsi.toFixed(2)}). Shielding from Peak.`;
      } else if (ema9 < ema21 && rsi >= 35 && rsi <= 50 && !isAtValley) {
        action = 'PUT';
        reason = `Bearish Momentum: EMA9 Cross + RSI Pullback (${rsi.toFixed(2)}). Shielding from Valley.`;
      } else if (isAtPeak || isAtValley) {
        reason = `Trend Exhaustion Shield Active: Price is at a ${isAtPeak ? 'Peak' : 'Valley'}. Waiting for pullback.`;
      } else {
        reason = `Market Indecisive: RSI ${rsi.toFixed(2)} | EMA Diff: ${(ema9 - ema21).toFixed(3)}`;
      }

      if (action && derivSocketRef.current?.readyState === WebSocket.OPEN) {
        addLog(`PRODUCTION ORDER BROADCAST: ${action} - ${reason}`, 'success');
        derivSocketRef.current.send(JSON.stringify({
          buy: 1,
          price: 1,
          parameters: {
            amount: 1,
            basis: 'stake',
            contract_type: action,
            underlying_symbol: 'frxXAUUSD',
            currency: 'USD',
            duration: 5,
            duration_unit: 'm'
          }
        }));
      } else {
        addLog(`Analysis result: ${reason}`, 'info');
      }
    } catch (e: any) {
      addLog(`Analysis Exception: ${e.message}`, 'error');
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [addLog]);

  useEffect(() => {
    if (derivActive && user && db) {
      const appId = '34ZRxvOFBnNAdQsr1T3bF';
      const token = 'pat_8c00afda6815eaf4c032b0e58194c67bf3e644128db301070f7a169903868298';
      let pingInterval: NodeJS.Timeout;
      
      const connectBridge = async () => {
        addLog(`Initializing Mainnet Bridge (Production)...`, 'info');
        
        try {
          const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            headers: { 'Authorization': `Bearer ${token}`, 'Deriv-App-ID': appId }
          });

          const getJson = await accountsRes.json();
          const accountsArray = getJson.data || [];
          const realAcc = accountsArray.find((a: any) => a.account_type === 'real');
          
          let accountId = realAcc?.id || realAcc?.account_id;

          if (!accountId) {
            addLog('Error: Institutional Account not found. Verify production token.', 'error');
            return;
          }

          const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Deriv-App-ID': appId }
          });

          const otpData = await otpResponse.json();
          const wsUrl = otpData.data?.url || otpData.url;

          if (!wsUrl) throw new Error('Secure handshake failed.');

          const socket = new WebSocket(wsUrl);

          socket.onopen = () => {
            addLog('Mainnet Handshake Secure. Monitoring frxXAUUSD...', 'success');
            socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            socket.send(JSON.stringify({ ticks: 'frxXAUUSD', subscribe: 1 }));
            
            pingInterval = setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ ping: 1 }));
              }
            }, 30000);
          };

          socket.onclose = () => {
            addLog('WebSocket Disconnected', 'warning');
            clearInterval(pingInterval);
          };

          socket.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.error) {
              addLog(`Bridge Protocol Error: ${data.error.message}`, 'error');
              return;
            }
            if (data.msg_type === 'tick') {
              const price = data.tick.quote;
              tickStreamRef.current = [...tickStreamRef.current.slice(-99), price];
              if (botActiveRef.current) triggerMathematicalAnalysis();
            }
            if (data.msg_type === 'balance') {
              const currentBal = parseFloat(data.balance.balance);
              setDerivBalance(currentBal);
              if (sessionStartingBalance === null) setSessionStartingBalance(currentBal);
              else {
                const sessionPnL = currentBal - sessionStartingBalance;
                if (sessionPnL <= -3) {
                  addLog(`CIRCUIT BREAKER: Session loss limit reached ($3.00).`, 'error');
                  setBotActive(false);
                  updateDoc(doc(db, 'users', user.uid), { botActive: false });
                }
              }
            }
            if (data.msg_type === 'buy') {
              const contractId = data.buy.contract_id;
              if (contractId) {
                addLog(`PRODUCTION ORDER ACCEPTED: [ID: ${contractId}]`, 'success');
                socket.send(JSON.stringify({
                  proposal_open_contract: 1,
                  contract_id: contractId,
                  subscribe: 1
                }));
              }
            }
            if (data.msg_type === 'proposal_open_contract') {
              const contract = data.proposal_open_contract;
              if (contract.is_sold) {
                const status = contract.status.toUpperCase();
                const profit = contract.profit;
                if (status === 'WON') {
                  addLog(`CONTRACT SETTLED: WON (+$${profit.toFixed(2)})`, 'success');
                } else {
                  addLog(`CONTRACT SETTLED: LOST (-$1.00)`, 'error');
                }
                socket.send(JSON.stringify({ forget: data.subscription.id }));
              }
            }
          };

          derivSocketRef.current = socket;
        } catch (err: any) {
          addLog(`Bridge Connection Failed: ${err.message}`, 'error');
        }
      };

      connectBridge();
      return () => {
        clearInterval(pingInterval);
        if (derivSocketRef.current && derivSocketRef.current.readyState === WebSocket.OPEN) {
          derivSocketRef.current.close();
        }
      };
    }
  }, [derivActive, user, db, addLog, triggerMathematicalAnalysis]);

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
      unsubProfile(); unsubAssets(); unsubTx(); unsubStocks(); 
    };
  }, [db, user]);

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
      liquidateEarnings, syncOnChainBalance: async () => null, addLog, addStockLog
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
