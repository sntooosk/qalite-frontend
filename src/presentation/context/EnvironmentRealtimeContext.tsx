import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Environment } from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';

interface EnvironmentRealtimeState {
  value: Environment | null;
  isLoading: boolean;
  error: string | null;
}

interface EnvironmentStoreState {
  value: Environment[];
  isLoading: boolean;
}

interface EnvironmentRealtimeContextValue {
  getEnvironmentState: (environmentId: string) => EnvironmentRealtimeState | undefined;
  getStoreState: (storeId: string) => EnvironmentStoreState | undefined;
  subscribeEnvironment: (environmentId: string) => () => void;
  subscribeStoreEnvironments: (storeId: string) => () => void;
}

const EnvironmentRealtimeContext = createContext<EnvironmentRealtimeContextValue | null>(null);

export const EnvironmentRealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [environmentStates, setEnvironmentStates] = useState<
    Record<string, EnvironmentRealtimeState>
  >({});
  const [storeStates, setStoreStates] = useState<Record<string, EnvironmentStoreState>>({});
  const environmentSubscriptions = useRef(
    new Map<string, { count: number; unsubscribe: () => void }>(),
  );
  const storeSubscriptions = useRef(new Map<string, { count: number; unsubscribe: () => void }>());

  const releaseEnvironment = useCallback((environmentId: string) => {
    const subscription = environmentSubscriptions.current.get(environmentId);
    if (!subscription) {
      return;
    }

    subscription.count -= 1;
    if (subscription.count <= 0) {
      subscription.unsubscribe();
      environmentSubscriptions.current.delete(environmentId);
    }
  }, []);

  const releaseStore = useCallback((storeId: string) => {
    const subscription = storeSubscriptions.current.get(storeId);
    if (!subscription) {
      return;
    }

    subscription.count -= 1;
    if (subscription.count <= 0) {
      subscription.unsubscribe();
      storeSubscriptions.current.delete(storeId);
    }
  }, []);

  const subscribeEnvironment = useCallback(
    (environmentId: string) => {
      const existing = environmentSubscriptions.current.get(environmentId);
      if (existing) {
        existing.count += 1;
        return () => releaseEnvironment(environmentId);
      }

      setEnvironmentStates((previous) => ({
        ...previous,
        [environmentId]: {
          value: previous[environmentId]?.value ?? null,
          isLoading: true,
          error: null,
        },
      }));

      const unsubscribe = environmentService.observeEnvironment(environmentId, (environment) => {
        setEnvironmentStates((previous) => ({
          ...previous,
          [environmentId]: {
            value: environment,
            isLoading: false,
            error: environment ? null : 'Ambiente não encontrado.',
          },
        }));
      });

      environmentSubscriptions.current.set(environmentId, { count: 1, unsubscribe });

      return () => releaseEnvironment(environmentId);
    },
    [releaseEnvironment],
  );

  const subscribeStoreEnvironments = useCallback(
    (storeId: string) => {
      const existing = storeSubscriptions.current.get(storeId);
      if (existing) {
        existing.count += 1;
        return () => releaseStore(storeId);
      }

      setStoreStates((previous) => ({
        ...previous,
        [storeId]: {
          value: previous[storeId]?.value ?? [],
          isLoading: true,
        },
      }));

      const unsubscribe = environmentService.observeAll({ storeId }, (list) => {
        setStoreStates((previous) => ({
          ...previous,
          [storeId]: {
            value: list,
            isLoading: false,
          },
        }));
      });

      storeSubscriptions.current.set(storeId, { count: 1, unsubscribe });

      return () => releaseStore(storeId);
    },
    [releaseStore],
  );

  useEffect(() => {
    const environmentSubscriptionsRef = environmentSubscriptions.current;
    const storeSubscriptionsRef = storeSubscriptions.current;

    return () => {
      environmentSubscriptionsRef.forEach((subscription) => subscription.unsubscribe());
      environmentSubscriptionsRef.clear();
      storeSubscriptionsRef.forEach((subscription) => subscription.unsubscribe());
      storeSubscriptionsRef.clear();
    };
  }, []);

  const value = useMemo<EnvironmentRealtimeContextValue>(
    () => ({
      getEnvironmentState: (environmentId: string) => environmentStates[environmentId],
      getStoreState: (storeId: string) => storeStates[storeId],
      subscribeEnvironment,
      subscribeStoreEnvironments,
    }),
    [environmentStates, storeStates, subscribeEnvironment, subscribeStoreEnvironments],
  );

  return (
    <EnvironmentRealtimeContext.Provider value={value}>
      {children}
    </EnvironmentRealtimeContext.Provider>
  );
};

export const useEnvironmentRealtimeContext = () => {
  const context = useContext(EnvironmentRealtimeContext);
  if (!context) {
    throw new Error(
      'useEnvironmentRealtimeContext must be used within EnvironmentRealtimeProvider',
    );
  }
  return context;
};
