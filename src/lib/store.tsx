
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface WalletAsset {
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

export interface UserSession {
  email: string;
  uid: string;
}

interface VaultContextType {
  assets: WalletAsset[];
  transactions: Transaction[];
  user: UserSession | null;
  initialized: boolean;
  signIn: (email: string) => UserSession;
  signOut: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string) => string;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedAssets = localStorage.getItem('cv_assets_v1');
    const savedTxs = localStorage.getItem('cv_txs_v1');
    const savedUser = localStorage.getItem('cv_user_v1');
    
    if (savedAssets) {
      try {
        setAssets(JSON.parse(savedAssets));
      } catch (e) {
        console.error("Failed to parse assets", e);
      }
    }
    
    if (savedTxs) {
      try {
        setTransactions(JSON.parse(savedTxs));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized && typeof window !== 'undefined') {
      localStorage.setItem('cv_assets_v1', JSON.stringify(assets));
      localStorage.setItem('cv_txs_v1', JSON.stringify(transactions));
      if (user) {
        localStorage.setItem('cv_user_v1', JSON.stringify(user));
      } else {
        localStorage.removeItem('cv_user_v1');
      }
    }
  }, [assets, transactions, user, initialized]);

  const signIn = (email: string) => {
    const newUser = { email, uid: `u_${Math.random().toString(36).substring(2, 11)}` };
    setUser(newUser);
    return newUser;
  };

  const signOut = () => {
    setUser(null);
    setAssets([]);
    setTransactions([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cv_assets_v1');
      localStorage.removeItem('cv_txs_v1');
      localStorage.removeItem('cv_user_v1');
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const updateBalance = (currency: string, amountChange: number, fiatPrice: number) => {
    setAssets(prev => prev.map(asset => {
      if (asset.currency === currency) {
        const newAmount = asset.amount + amountChange;
        return {
          ...asset,
          amount: Math.max(0, newAmount),
          fiatValueUSD: Math.max(0, newAmount) * fiatPrice
        };
      }
      return asset;
    }));
  };

  const generateNewWallet = (currency: string) => {
    const pKey = generatePrivateKey();
    const account = privateKeyToAccount(pKey);
    
    const newAsset: WalletAsset = {
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address: account.address,
      isLive: true,
      privateKey: pKey
    };
    
    setAssets(prev => [...prev, newAsset]);
    return account.address;
  };

  return (
    <VaultContext.Provider value={{ 
      assets, 
      transactions, 
      user, 
      initialized, 
      signIn, 
      signOut, 
      addTransaction, 
      updateBalance, 
      generateNewWallet 
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVaultStore() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVaultStore must be used within a VaultProvider');
  }
  return context;
}
