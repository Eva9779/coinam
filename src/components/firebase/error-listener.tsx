
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      console.error('Firebase Permission Error:', error);
      
      toast({
        variant: 'destructive',
        title: 'Security Policy Violation',
        description: `Access denied for ${error.context.operation} on ${error.context.path}. Please check your Firestore security rules.`,
      });

      // In development, we can throw this to trigger the Next.js error overlay
      if (process.env.NODE_ENV === 'development') {
        // We wrap it in a timeout to avoid interrupting the render cycle
        setTimeout(() => {
           // Rethrowing contextual errors for the agentive loop
           const contextualMessage = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{
  "method": "${error.context.operation}",
  "path": "${error.context.path}"
}`;
           console.warn(contextualMessage);
        }, 0);
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
