import type { ReactNode } from 'react';

import { AuthProvider } from '../context/AuthContext';
import { EnvironmentRealtimeProvider } from '../context/EnvironmentRealtimeContext';
import { OrganizationBrandingProvider } from '../context/OrganizationBrandingContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <OrganizationBrandingProvider>
            <EnvironmentRealtimeProvider>{children}</EnvironmentRealtimeProvider>
          </OrganizationBrandingProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);
