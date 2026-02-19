
'use client';

import { useState, useEffect } from 'react';

export interface WalletAsset {
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
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

const DEFAULT_ASSETS: WalletAsset[] = [
  { currency: 'BTC', amount: 0.45, fiatValueUSD: 28540.50, address: 'bc1q8h...v9f' },
  { currency: 'ETH', amount: 5.2, fiatValueUSD: 12480.00, address: '0x71C...65e' },
  { currency: 'SOL', amount: 150.0, fiatValueUSD: 14250.00, address: 'GvT9...vXw' },
  { currency: 'USDC', amount: 5000.0, fiatValueUSD: 5000.00, address: '0xUSDC...abc' },
];

export function useVaultStore() {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedAssets = localStorage.getItem('cv_assets');
    const savedTxs = localStorage.getItem('cv_txs');
    
    if (savedAssets) setAssets(JSON.parse(savedAssets));
    else setAssets(DEFAULT_ASSETS);
    
    if (savedTxs) setTransactions(JSON.parse(savedTxs));
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem('cv_assets', JSON.stringify(assets));
      localStorage.setItem('cv_txs', JSON.stringify(transactions));
    }
  }, [assets, transactions, initialized]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setTransactions([newTx, ...transactions]);
  };

  const updateBalance = (currency: string, amountChange: number, fiatPrice: number) => {
    setAssets(prev => prev.map(asset => {
      if (asset.currency === currency) {
        const newAmount = asset.amount + amountChange;
        return {
          ...asset,
          amount: newAmount,
          fiatValueUSD: newAmount * fiatPrice
        };
      }
      return asset;
    }));
  };

  const generateNewWallet = (currency: string) => {
    const randomAddr = `${currency.toLowerCase()}_${Math.random().toString(36).substr(2, 12)}`;
    const newAsset: WalletAsset = {
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address: randomAddr
    };
    setAssets([...assets, newAsset]);
    return randomAddr;
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
