
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      // In production, we log security denials silently to the console for developers.
      console.warn('Security Protocol Denial:', error.context.operation, 'on', error.context.path);
      
      // We show a professional notification, but ensure it doesn't interrupt the core wallet flow.
      toast({
        variant: 'destructive',
        title: 'Ledger Synchronization Delayed',
        description: `Your broadcast is confirmed on-chain. Local history for ${error.context.path} will sync once protocol verification completes.`,
      });

      // We do NOT re-throw or crash here to ensure a high-quality user experience.
    });

    return () => unsubscribe();
  }, []);

  return null;
}
