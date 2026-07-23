
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

  // Primary Assets Listener - Hardened for persistence
  useEffect(() => {
    if (!db || !user) {
      setInitialized(false);
      setIsSyncing(false);
      setAssets([]);
      return;
    }

    setIsSyncing(true);
    const assetsRef = collection(db, 'users', user.uid, 'assets');
    
    // We listen to the collection. We only mark initialized when we get a non-cache result
    // or when data actually arrives.
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as WalletAsset));
      
      setAssets(assetsData);
      
      // CRITICAL: Only set initialized to true if we've successfully contacted the server
      // or if we have data (even from cache). This prevents "guessing" the vault is empty.
      if (!snapshot.metadata.fromCache || snapshot.size > 0) {
        setInitialized(true);
        setIsSyncing(false);
      }
    }, (error) => {
      setIsSyncing(false);
      // We don't mark as initialized on error to prevent accidental overwrites
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: assetsRef.path,
        operation: 'list'
      }));
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

  const generateNewWallet = useCallback(async (currency: string, customId?: string) => {
    // SAFETY CHECK: Never allow generation if we haven't confirmed current state with the server
    if (!db || !user || isSyncing || !initialized) {
      toast({ title: "Synchronizing with cloud... Please wait." });
      return null;
    }

    const finalId = customId || 'primary-vault';
    
    // 1. Double-check if it already exists in our verified synced state
    const existing = assets.find(a => a.id === finalId);
    if (existing) {
      toast({ title: "Vault already exists. Retrieving address..." });
      return existing.address;
    }

    setProvisioning(true);
    
    try {
      // 2. Establish User Profile (Root Document)
      const userDocRef = doc(db, 'users', user.uid);
      const profileData = {
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      
      // Non-blocking write for profile
      setDoc(userDocRef, profileData, { merge: true }).catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'write'
        }));
      });

      // 3. Generate NEW Cryptographic Material
      const pKey = generatePrivateKey();
      const account = privateKeyToAccount(pKey);
      
      const newAsset: WalletAsset = {
        id: finalId,
        currency,
        amount: 0,
        fiatValueUSD: 0,
        address: account.address,
        isLive: true,
        privateKey: pKey
      };
      
      const assetDocRef = doc(db, 'users', user.uid, 'assets', finalId);
      
      // CRITICAL: We initiatize the write but do NOT block. 
      // This ensures the local state updates optimistically.
      setDoc(assetDocRef, newAsset).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: assetDocRef.path,
          operation: 'create',
          requestResourceData: { currency },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
      
      return account.address;
    } catch (e: any) {
      toast({ title: "Internal vault error", variant: "destructive" });
      return null;
    } finally {
      setProvisioning(false);
    }
  }, [db, user, assets, initialized, isSyncing]);

  const importPrivateKey = async (currency: string, privateKey: `0x${string}`) => {
    if (!db || !user || isSyncing) return;

    try {
      const account = privateKeyToAccount(privateKey);
      const existing = assets.find(a => a.address.toLowerCase() === account.address.toLowerCase());
      
      if (existing) {
        toast({ title: "Address already verified in vault." });
        return;
      }

      const assetDocRef = doc(db, 'users', user.uid, 'assets', `imported_${Date.now()}`);
      
      const importedAsset: WalletAsset = {
        id: assetDocRef.id,
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
          operation: 'create'
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
        operation: 'create'
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
        operation: 'update'
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
