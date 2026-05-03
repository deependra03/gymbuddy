'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: isDark
          ? {
              background: '#18181b',
              color: '#f4f4f5',
              border: '1px solid #3f3f46',
            }
          : {
              background: '#ffffff',
              color: '#18181b',
              border: '1px solid #e4e4e7',
            },
        success: {
          iconTheme: isDark
            ? { primary: '#f97316', secondary: '#18181b' }
            : { primary: '#f97316', secondary: '#ffffff' },
        },
      }}
    />
  );
}
