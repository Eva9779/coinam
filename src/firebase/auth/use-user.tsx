
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';

export function useUser(auth: Auth) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  return { user, loading: user === undefined };
}
