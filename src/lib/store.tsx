
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
  updateDoc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

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
  isSyncing: boolean;
  hasError: boolean;
  user: any;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string, customId?: string) => string;
  importPrivateKey: (currency: string, privateKey: `0x${string}`) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isSyncedWithServer, setIsSyncedWithServer] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isProvisioning = useRef(false);
  const { user } = useUserHook();
  const db = useFirestore();

  // Primary Assets Listener
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
      setIsSyncedWithServer(false);
      setAssets([]);
      return;
    }

    setIsSyncing(true);
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as WalletAsset));
      
      setAssets(assetsData);
      
      // We only consider it "initialized" once we've heard from the server (not just cache)
      if (!snapshot.metadata.fromCache) {
        setIsSyncedWithServer(true);
        setInitialized(true);
        setIsSyncing(false);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      if (error.code !== 'unavailable') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetsRef.path,
          operation: 'list'
        }));
        setHasError(true);
      }
      setIsSyncing(false);
      setInitialized(true); // Stop loading even on error
    });

    return () => unsubscribe();
  }, [db, user]);

  // Transactions Ledger Listener
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
      if (error.code !== 'unavailable') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: txRef.path,
          operation: 'list'
        }));
      }
    });

    return () => unsubscribe();
  }, [db, user]);

  const generateNewWallet = useCallback((currency: string, customId?: string) => {
    if (!db || !user) return '';

    const pKey = generatePrivateKey();
    const account = privateKeyToAccount(pKey);
    
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    // Using a deterministic ID for the primary vault to prevent duplicates
    const finalId = customId || (assets.length === 0 ? 'primary-vault' : undefined);
    const assetDocRef = finalId ? doc(assetsRef, finalId) : doc(assetsRef);
    
    const newAsset: WalletAsset = {
      id: assetDocRef.id,
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address: account.address,
      isLive: true,
      privateKey: pKey
    };
    
    setDoc(assetDocRef, newAsset, { merge: true })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: newAsset
        }));
      });

    return account.address;
  }, [db, user, assets.length]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;

    try {
      const account = privateKeyToAccount(privateKey);
      const existing = assets.find(a => a.address.toLowerCase() === account.address.toLowerCase());
      
      if (existing) {
        toast({ title: "Address already in vault" });
        return;
      }

      const assetsRef = collection(db, 'users', user.uid, 'assets');
      const assetDocRef = doc(assetsRef);
      
      const importedAsset: WalletAsset = {
        id: assetDocRef.id,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: privateKey
      };
      
      await setDoc(assetDocRef, importedAsset);
      
      toast({
        title: "Vault Restored",
        description: `Imported key: ${account.address.slice(0, 10)}...`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Critical: Provision primary vault ONLY after server confirmation of empty state
  useEffect(() => {
    if (
      isSyncedWithServer && 
      initialized && 
      user && 
      assets.length === 0 && 
      !isProvisioning.current
    ) {
      isProvisioning.current = true;
      generateNewWallet('ETH', 'primary-vault');
    }
  }, [isSyncedWithServer, initialized, user, assets.length, generateNewWallet]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const newTx: Transaction = {
      ...tx,
      id: txId,
      timestamp: new Date().toISOString(),
    };
    setDoc(txDocRef, newTx).catch(() => {});
  };

  const updateBalance = (currency: string, amountChange: number, fiatPrice: number) => {
    if (!db || !user) return;
    const asset = assets.find(a => a.currency === currency);
    if (!asset) return;
    const assetDocRef = doc(db, 'users', user.uid, 'assets', asset.id);
    const newAmount = Math.max(0, asset.amount + amountChange);
    updateDoc(assetDocRef, {
      amount: newAmount,
      fiatValueUSD: newAmount * fiatPrice
    }).catch(() => {});
  };

  return (
    <VaultContext.Provider value={{ 
      assets, 
      transactions, 
      initialized, 
      isSyncing,
      hasError,
      user,
      addTransaction, 
      updateBalance, 
      generateNewWallet,
      importPrivateKey
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
