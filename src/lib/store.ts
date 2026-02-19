
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

/**
 * Live Vault Store
 * Manages persistent on-chain keys and transaction history locally.
 */
export function useVaultStore() {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedAssets = localStorage.getItem('cv_assets_v1');
    const savedTxs = localStorage.getItem('cv_txs_v1');
    
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    }
    
    if (savedTxs) {
      setTransactions(JSON.parse(savedTxs));
    }
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized && typeof window !== 'undefined') {
      localStorage.setItem('cv_assets_v1', JSON.stringify(assets));
      localStorage.setItem('cv_txs_v1', JSON.stringify(transactions));
    }
  }, [assets, transactions, initialized]);

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

  /**
   * Generates a real cryptographic keypair for the specified network.
   */
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

  return { 
    assets, 
    transactions, 
    addTransaction, 
    updateBalance, 
    generateNewWallet,
    initialized 
  };
}
