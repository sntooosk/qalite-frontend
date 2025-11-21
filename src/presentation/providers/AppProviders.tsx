import type { ReactNode } from 'react';

import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <AuthProvider>{children}</AuthProvider>
  </ToastProvider>
);
