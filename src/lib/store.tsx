
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

  // Ensure root user document exists to satisfy security rule hierarchies
  useEffect(() => {
    if (db && user) {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((error) => {
        // Silently handle if rules aren't deployed yet, but log for debug
        console.warn('Initial profile sync pending rules deployment...');
      });
    }
  }, [db, user]);

  // Primary Assets Listener
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
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
      setInitialized(true);
      setIsSyncing(false);
    }, (error) => {
      // Permission errors here are expected if rules haven't fully propagated
      // We set initialized to true to avoid hanging, but don't emit error to UI yet
      if (error.code === 'permission-denied') {
        console.warn('Vault access blocked by security rules. Retrying connection...');
        // We keep isSyncing true to show loading state instead of error
      } else {
        setInitialized(true);
        setIsSyncing(false);
      }
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
      if (error.code === 'permission-denied') {
        console.warn('Ledger access blocked by security rules.');
      }
    });

    return () => unsubscribe();
  }, [db, user]);

  const generateNewWallet = useCallback(async (currency: string, customId: string = 'primary-vault') => {
    if (!db || !user || !initialized) {
      toast({ title: "Synchronizing with cloud vault..." });
      return null;
    }

    const existingAsset = assets.find(a => a.id === customId);
    if (existingAsset) {
      toast({ title: "Vault endpoint already exists." });
      return existingAsset.address;
    }

    setProvisioning(true);
    
    try {
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const newAsset: WalletAsset = {
        id: customId,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      
      const assetDocRef = doc(db, 'users', user.uid, 'assets', customId);
      
      setDoc(assetDocRef, newAsset)
        .catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: assetDocRef.path,
            operation: 'create',
            requestResourceData: newAsset
          } satisfies SecurityRuleContext));
        });
      
      toast({ title: "Vault Successfully Provisioned" });
      return account.address;
    } catch (e: any) {
      toast({ title: "Internal provisioning error", variant: "destructive" });
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user, assets, initialized]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user) return;

    try {
      const account = privateKeyToAccount(privateKey);
      const existing = assets.find(a => a.address.toLowerCase() === account.address.toLowerCase());
      
      if (existing) {
        toast({ title: "Address already verified in vault." });
        return;
      }

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
      
      setDoc(assetDocRef, importedAsset).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: importedAsset
        }));
      });
      
      toast({
        title: "Vault Restored",
        description: `Imported address: ${account.address.slice(0, 10)}...`,
      });
    } catch (error: any) {
      toast({ title: "Import failed. Check key format.", variant: "destructive" });
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!db || !user) return;
    const txId = `tx_${Date.now()}`;
    const txDocRef = doc(db, 'users', user.uid, 'transactions', txId);
    const newTx: Transaction = {
      ...tx,
      id: txId,
      timestamp: new Date().toISOString(),
    };
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
    const updateData = {
      amount: newAmount,
      fiatValueUSD: newAmount * fiatPrice
    };
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
      assets, 
      transactions, 
      initialized, 
      isSyncing,
      isProvisioning: provisioning,
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
