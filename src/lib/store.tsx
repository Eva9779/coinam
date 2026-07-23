
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

  // Primary Assets Listener - Hardened for Production Sync
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
      setIsSyncedWithServer(false);
      setHasError(false);
      setAssets([]);
      return;
    }

    setIsSyncing(true);
    setHasError(false);
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    
    // Listen for real-time updates from the production enclave
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as WalletAsset));
      
      setAssets(assetsData);
      
      // CRITICAL: Only consider the vault "synced" when metadata confirms data is NOT just from cache.
      // This prevents the app from thinking the vault is empty just because the cache is empty.
      if (!snapshot.metadata.fromCache) {
        setIsSyncedWithServer(true);
      }

      setInitialized(true);
      setIsSyncing(false);
      setHasError(false);
    }, (error) => {
      // Only emit error if it's a legitimate permission issue
      if (error.code !== 'unavailable') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetsRef.path,
          operation: 'list'
        }));
        setHasError(true);
      }
      setIsSyncing(false);
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
    // Deterministic ID logic: Use 'primary-vault' for the initial setup
    const assetDocRef = customId ? doc(assetsRef, customId) : doc(assetsRef);
    const assetId = assetDocRef.id;
    
    const newAsset: WalletAsset = {
      id: assetId,
      currency,
      amount: 0,
      fiatValueUSD: 0,
      address: account.address,
      isLive: true,
      privateKey: pKey
    };
    
    // Initiate non-blocking write
    setDoc(assetDocRef, newAsset)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: newAsset
        }));
      });

    return account.address;
  }, [db, user]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;

    try {
      const account = privateKeyToAccount(privateKey);
      
      const existing = assets.find(a => a.address.toLowerCase() === account.address.toLowerCase());
      if (existing) {
        toast({ title: "Address already in vault", description: "This cryptographic key is already provisioned." });
        return;
      }

      const assetsRef = collection(db, 'users', user.uid, 'assets');
      const assetDocRef = doc(assetsRef);
      const assetId = assetDocRef.id;
      
      const importedAsset: WalletAsset = {
        id: assetId,
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
        description: `Imported existing ${currency} key: ${account.address.slice(0, 10)}...`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: "Invalid private key format. Please verify and try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  /**
   * Institutional Deterministic Auto-Provisioner
   * Only fires once a stable server-verified connection is confirmed.
   */
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
      // No need to reset ref, it's a one-time setup for the session
    }
  }, [isSyncedWithServer, initialized, user, assets.length, generateNewWallet]);

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
