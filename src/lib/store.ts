'use client';

import { useState, useEffect } from 'react';
import { INITIAL_WALLET_BALANCES, INITIAL_TRANSACTIONS } from './data';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface WalletAsset {
  currency: string;
  amount: number;
  fiatValueUSD: number;
  address: string;
  isLive?: boolean;
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

const DEFAULT_ASSETS: WalletAsset[] = INITIAL_WALLET_BALANCES.map(asset => ({
  ...asset,
  address: asset.currency === 'BTC' ? 'bc1q8h...v9f' : 
           asset.currency === 'ETH' ? '0x71C...65e' :
           asset.currency === 'SOL' ? 'GvT9...vXw' : '0xUSDC...abc',
  isLive: asset.currency === 'ETH'
}));

export function useVaultStore() {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedAssets = localStorage.getItem('cv_assets_v1');
    const savedTxs = localStorage.getItem('cv_txs_v1');
    
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    } else {
      setAssets(DEFAULT_ASSETS);
    }
    
    if (savedTxs) {
      setTransactions(JSON.parse(savedTxs));
    } else {
      setTransactions(INITIAL_TRANSACTIONS as any);
    }
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
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
          amount: newAmount,
          fiatValueUSD: newAmount * fiatPrice
        };
      }
      return asset;
    }));
  };

  const generateNewWallet = (currency: string) => {
    let address = '';
    let isLive = false;

    if (currency === 'ETH') {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      address = account.address;
      isLive = true;
    } else {
      address = `${currency.toLowerCase()}_${Math.random().toString(36).substring(2, 14)}`;
    }

    const newAsset: WalletAsset = {
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address,
      isLive
    };
    setAssets(prev => [...prev, newAsset]);
    return address;
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
