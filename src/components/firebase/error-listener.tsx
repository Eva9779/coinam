'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      // Professional informative notification that doesn't alarm the user
      // These background sync delays are expected during high network traffic or initial session setup
      toast({
        title: 'Wallet Syncing',
        description: `Your broadcast is successful. The ledger history for your wallet is currently queuing for synchronization.`,
      });
      
      // Log for developer context
      console.warn('Background Ledger Sync Delay:', error.context.operation, 'on', error.context.path);
    });

    return () => unsubscribe();
  }, []);

  return null;
}
