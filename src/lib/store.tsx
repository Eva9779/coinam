
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { useUserHook } from '@/firebase';

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

interface VaultContextType {
  assets: WalletAsset[];
  transactions: Transaction[];
  initialized: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string) => string;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);
  const { user } = useUserHook();

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const savedAssets = localStorage.getItem(`cv_assets_${user.uid}`);
    const savedTxs = localStorage.getItem(`cv_txs_${user.uid}`);
    
    if (savedAssets) {
      try {
        setAssets(JSON.parse(savedAssets));
      } catch (e) {
        console.error("Failed to parse assets", e);
      }
    } else {
      setAssets([]);
    }
    
    if (savedTxs) {
      try {
        setTransactions(JSON.parse(savedTxs));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    } else {
      setTransactions([]);
    }
    
    setInitialized(true);
  }, [user]);

  useEffect(() => {
    if (initialized && user && typeof window !== 'undefined') {
      localStorage.setItem(`cv_assets_${user.uid}`, JSON.stringify(assets));
      localStorage.setItem(`cv_txs_${user.uid}`, JSON.stringify(transactions));
    }
  }, [assets, transactions, user, initialized]);

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
      initialized, 
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
