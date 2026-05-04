'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initFromStorage = useAuthStore((state) => state.initFromStorage);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    console.log('AuthProvider - Initializing auth from storage');
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    console.log('AuthProvider - Auth state updated:', { user, token });
  }, [user, token]);

  return <>{children}</>;
}
