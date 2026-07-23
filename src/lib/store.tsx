
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
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
  isProvisioning: boolean;
  user: any;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (currency: string, amountChange: number, fiatPrice: number) => void;
  generateNewWallet: (currency: string, customId?: string) => Promise<string | null>;
  importPrivateKey: (currency: string, privateKey: `0x${string}`) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  
  const { user } = useUserHook();
  const db = useFirestore();

  // Root User Document Creation: Ensures parent doc exists for security rules
  useEffect(() => {
    if (db && user) {
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      
      setDoc(userDocRef, userData, { merge: true }).catch((e) => {
        // Quiet warning for initialization
        console.warn('Root profile sync pending...');
      });
    }
  }, [db, user]);

  // Assets Synchronization
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
      setAssets([]);
      return;
    }

    setIsSyncing(true);
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    
    // Safety Timeout: Force initialization if cloud connection hangs
    const timeout = setTimeout(() => {
      if (!initialized) {
        setInitialized(true);
        setIsSyncing(false);
      }
    }, 4000);

    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as WalletAsset));
      
      setAssets(assetsData);
      setInitialized(true);
      setIsSyncing(false);
      clearTimeout(timeout);
    }, (error) => {
      if (error.code === 'permission-denied') {
        // Handle silently here, generateNewWallet will re-surface if needed
        console.warn('Vault access pending authorization...');
      } else {
        console.error('Vault Sync Error:', error);
      }
      
      setInitialized(true);
      setIsSyncing(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [db, user, initialized]);

  // Ledger Synchronization
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
      console.warn('Ledger sync deferred');
    });

    return () => unsubscribe();
  }, [db, user]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-vault') => {
    if (!db || !user) return null;

    setProvisioning(true);
    
    try {
      // Step 1: Ensure User Profile exists (Crucial for hierarchical rules)
      const userDocRef = doc(db, 'users', user.uid);
      const userData = { 
        uid: user.uid, 
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      
      // Non-blocking mutation
      setDoc(userDocRef, userData, { merge: true }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData
        }));
      });

      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const newAsset: WalletAsset = {
        id: customId,
        currency,
        amount: 0.05, 
        fiatValueUSD: 100,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      
      // Step 2: Provision Vault Endpoint (Non-blocking)
      const assetDocRef = doc(db, 'users', user.uid, 'assets', customId);
      
      setDoc(assetDocRef, newAsset).catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: newAsset
        }));
      });
      
      toast({ title: "Secure Vault Initialized" });
      return account.address;
    } catch (e: any) {
      toast({ title: "Provisioning error", variant: "destructive", description: e.message });
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;
    try {
      const account = privateKeyToAccount(privateKey);
      const assetId = `imported_${Date.now()}`;
      const assetDocRef = doc(db, 'users', user.uid, 'assets', assetId);
      const importedAsset: WalletAsset = {
        id: assetId,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: privateKey
      };
      
      setDoc(assetDocRef, importedAsset).catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: importedAsset
        }));
      });
      toast({ title: "Vault Restored" });
    } catch (error: any) {
      toast({ title: "Import failed", variant: "destructive" });
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const newTx: Transaction = { ...tx, id: txId, timestamp: new Date().toISOString() };
    
    setDoc(txDocRef, newTx).catch((e) => {
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
    const updateData = { amount: newAmount, fiatValueUSD: newAmount * fiatPrice };
    
    updateDoc(assetDocRef, updateData).catch((e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetDocRef.path,
        operation: 'update',
        requestResourceData: updateData
      }));
    });
  };

  return (
    <VaultContext.Provider value={{ 
      assets, transactions, initialized, isSyncing, isProvisioning: provisioning, user,
      addTransaction, updateBalance, generateNewWallet, importPrivateKey
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVaultStore() {
  const context = useContext(VaultContext);
  if (context === undefined) throw new Error('useVaultStore must be used within a VaultProvider');
  return context;
}
