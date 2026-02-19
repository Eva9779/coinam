
'use client';

import { useState, useEffect } from 'react';
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

/**
 * Live Vault Store
 * Manages persistent on-chain keys, transaction history, and user sessions locally.
 */
export function useVaultStore() {
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
      setAssets(JSON.parse(savedAssets));
    }
    
    if (savedTxs) {
      setTransactions(JSON.parse(savedTxs));
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
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

  return { 
    assets, 
    transactions, 
    user,
    addTransaction, 
    updateBalance, 
    generateNewWallet,
    signIn,
    signOut,
    initialized 
  };
}
