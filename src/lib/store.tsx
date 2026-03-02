
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { useUserHook, useFirestore } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface WalletAsset {
  id: string;
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
  user: any;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string) => string;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);
  const isProvisioning = useRef(false);
  const { user } = useUserHook();
  const db = useFirestore();

  // Sync Assets from Firestore
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setAssets([]);
      return;
    }

    const assetsRef = collection(db, 'users', user.uid, 'assets');
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as WalletAsset));
      setAssets(assetsData);
      setInitialized(true);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetsRef.path,
        operation: 'list'
      }));
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [db, user]);

  // Sync Transactions from Firestore
  useEffect(() => {
    if (!db || !user) {
      setTransactions([]);
      return;
    }

    const txRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(txRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => doc.data() as Transaction);
      setTransactions(txData);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'list'
      }));
    });

    return () => unsubscribe();
  }, [db, user]);

  const generateNewWallet = useCallback((currency: string) => {
    if (!db || !user) return '';

    const pKey = generatePrivateKey();
    const account = privateKeyToAccount(pKey);
    
    // Using the currency as part of the ID but with a random suffix to ensure unique doc creation
    const assetId = `wallet_${currency.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`;
    const assetDocRef = doc(db, 'users', user.uid, 'assets', assetId);
    
    const newAsset: WalletAsset = {
      id: assetId,
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address: account.address,
      isLive: true,
      privateKey: pKey
    };
    
    setDoc(assetDocRef, newAsset).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetDocRef.path,
        operation: 'create',
        requestResourceData: newAsset
      }));
    });

    return account.address;
  }, [db, user]);

  // Persistent Auto-provisioning logic
  useEffect(() => {
    // Only provision if:
    // 1. Initialized is true (first snapshot attempt completed)
    // 2. User exists
    // 3. Assets array is confirmed empty
    // 4. We aren't already provisioning
    if (initialized && user && assets.length === 0 && !isProvisioning.current) {
      isProvisioning.current = true;
      const timer = setTimeout(() => {
        // Final sanity check before write
        if (assets.length === 0) {
          generateNewWallet('ETH');
        }
        isProvisioning.current = false;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [initialized, user, assets.length, generateNewWallet]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;

    const txId = `tx_${Math.random().toString(36).substring(2, 11)}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const newTx: Transaction = {
      ...tx,
      id: txId,
      timestamp: new Date().toISOString(),
    };

    setDoc(txDocRef, newTx).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txDocRef.path,
        operation: 'create',
        requestResourceData: newTx
      }));
    });
  };

  const updateBalance = (currency: string, amountChange: number, fiatPrice: number) => {
    if (!db || !user) return;

    const asset = assets.find(a => a.currency === currency);
    if (!asset) return;

    const assetDocRef = doc(db, 'users', user.uid, 'assets', asset.id);
    const newAmount = Math.max(0, asset.amount + amountChange);
    const updateData = {
      amount: newAmount,
      fiatValueUSD: newAmount * fiatPrice
    };

    updateDoc(assetDocRef, updateData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetDocRef.path,
        operation: 'update',
        requestResourceData: updateData
      }));
    });
  };

  return (
    <VaultContext.Provider value={{ 
      assets, 
      transactions, 
      initialized, 
      user,
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
