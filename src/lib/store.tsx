
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
  const autoProvisionAttempted = useRef(false);
  
  const { user } = useUserHook();
  const db = useFirestore();

  // Assets Synchronization Listener
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
      setAssets([]);
      return;
    }

    setIsSyncing(true);
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    
    // Release the "Syncing" hang after 3 seconds even if cloud is empty or rules are propagating
    const timeout = setTimeout(() => {
      if (!initialized) {
        setInitialized(true);
        setIsSyncing(false);
      }
    }, 3000);

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
      // Quietly log permission issues during initial sync
      if (error.code === 'permission-denied') {
        console.warn('Vault sync deferred: Firestore security rules may still be initializing for this account.');
      }
      setInitialized(true);
      setIsSyncing(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [db, user]);

  // Ledger Synchronization Listener
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
      // Step 1: establish Root Identity (Non-blocking)
      const userDocRef = doc(db, 'users', user.uid);
      const userData = { 
        uid: user.uid, 
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      
      setDoc(userDocRef, userData, { merge: true }).catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write',
          requestResourceData: userData
        } satisfies SecurityRuleContext));
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
        } satisfies SecurityRuleContext));
      });
      
      console.log(`Autonomous Vault Provisioned: ${account.address}`);
      return account.address;
    } catch (e: any) {
      console.error('Provisioning failure:', e);
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user]);

  // NEURAL AUTO-PROVISION: If initialized but empty, provision the vault automatically
  useEffect(() => {
    if (initialized && user && assets.length === 0 && !provisioning && !autoProvisionAttempted.current) {
      autoProvisionAttempted.current = true;
      generateNewWallet('ETH', 'primary-vault');
    }
  }, [initialized, user, assets.length, provisioning, generateNewWallet]);

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
        } satisfies SecurityRuleContext));
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
      } satisfies SecurityRuleContext));
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
      } satisfies SecurityRuleContext));
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
