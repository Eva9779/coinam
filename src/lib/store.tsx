
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
  getDoc
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
  const [hasError, setHasError] = useState(false);
  const isProvisioning = useRef(false);
  const { user } = useUserHook();
  const db = useFirestore();

  // Primary Assets Listener - Hardened for Production Sync
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
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
      setInitialized(true);
      setIsSyncing(false);
      setHasError(false);
    }, (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetsRef.path,
        operation: 'list'
      }));
      setHasError(true);
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
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: txRef.path,
        operation: 'list'
      }));
    });

    return () => unsubscribe();
  }, [db, user]);

  const generateNewWallet = useCallback((currency: string, customId?: string) => {
    if (!db || !user) return '';

    const pKey = generatePrivateKey();
    const account = privateKeyToAccount(pKey);
    
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    // Deterministic ID logic: Use provided ID or generate a random one
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
    
    // ATOMIC PERSISTENCE
    setDoc(assetDocRef, newAsset)
      .then(() => {
        toast({
          title: "Vault Key Secured",
          description: "Hardware cryptographic material successfully persisted to the cloud enclave.",
        });
      })
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
   * Uses a stable document ID ('primary-vault') to prevent duplicate generation.
   */
  useEffect(() => {
    const provisionPrimaryVault = async () => {
      if (
        initialized && 
        !isSyncing && 
        !hasError && 
        user && 
        assets.length === 0 && 
        !isProvisioning.current
      ) {
        isProvisioning.current = true;
        
        // Final sanity check: try to fetch a specific 'primary-vault' document
        // before generating anything, to handle race conditions across devices.
        const primaryRef = doc(db, 'users', user.uid, 'assets', 'primary-vault');
        const primarySnap = await getDoc(primaryRef);

        if (!primarySnap.exists()) {
          generateNewWallet('ETH', 'primary-vault');
        } else {
          // If it exists but somehow hasn't synced to local state yet, 
          // we just wait for the onSnapshot to catch up.
          console.log('Primary vault detected in cloud, skipping generation.');
        }
        
        isProvisioning.current = false;
      }
    };

    provisionPrimaryVault();
  }, [initialized, isSyncing, hasError, user, assets.length, generateNewWallet, db]);

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
