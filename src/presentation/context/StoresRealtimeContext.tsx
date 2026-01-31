import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { StoreSummary } from '../../domain/entities/store';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useOrganizationBranding } from './OrganizationBrandingContext';

interface StoresRealtimeContextValue {
  organizationId: string | null;
  stores: StoreSummary[];
  isLoading: boolean;
  error: string | null;
}

const StoresRealtimeContext = createContext<StoresRealtimeContextValue | undefined>(undefined);

const initialState = {
  stores: [],
  isLoading: false,
  error: null,
};

export const StoresRealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { activeOrganization } = useOrganizationBranding();
  const [state, setState] = useState<{
    stores: StoreSummary[];
    isLoading: boolean;
    error: string | null;
  }>(initialState);

  useEffect(() => {
    if (!activeOrganization?.id) {
      setState(initialState);
      return;
    }

    let isMounted = true;
    setState({ stores: [], isLoading: true, error: null });

    const fetchStores = async () => {
      try {
        const stores = await storeService.listSummaryAll(activeOrganization.id, (fresh) => {
          if (isMounted) {
            setState({ stores: fresh, isLoading: false, error: null });
          }
        });
        if (isMounted) {
          setState({ stores, isLoading: false, error: null });
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setState((previous) => ({
            ...previous,
            isLoading: false,
            error: 'Não foi possível carregar as lojas.',
          }));
        }
      }
    };

    void fetchStores();

    return () => {
      isMounted = false;
    };
  }, [activeOrganization?.id]);

  const value = useMemo<StoresRealtimeContextValue>(
    () => ({
      organizationId: activeOrganization?.id ?? null,
      stores: state.stores,
      isLoading: state.isLoading,
      error: state.error,
    }),
    [activeOrganization?.id, state.error, state.isLoading, state.stores],
  );

  return <StoresRealtimeContext.Provider value={value}>{children}</StoresRealtimeContext.Provider>;
};

export const useStoresRealtime = (): StoresRealtimeContextValue => {
  const context = useContext(StoresRealtimeContext);

  if (!context) {
    throw new Error('useStoresRealtime must be used within StoresRealtimeProvider');
  }

  return context;
};
