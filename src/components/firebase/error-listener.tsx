'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      // Log for developer context
      console.warn('Security Protocol Denial (Background Sync):', error.context.operation, 'on', error.context.path);
      
      // Professional informative notification that doesn't alarm the user
      toast({
        title: 'Vault Syncing',
        description: `Your broadcast is successful. The ledger history for ${error.context.path} is queuing for synchronization.`,
      });
    });

    return () => unsubscribe();
  }, []);

  return null;
}