import { useEffect, useMemo } from 'react';

import type { Environment, EnvironmentStatus } from '../../domain/entities/environment';
import { useEnvironmentRealtimeContext } from '../context/EnvironmentRealtimeContext';

interface StatusCounts extends Record<EnvironmentStatus, number> {
  total: number;
}

interface UseStoreEnvironmentsResult {
  environments: Environment[];
  isLoading: boolean;
  statusCounts: StatusCounts;
}

const buildEmptyCounts = (): StatusCounts => ({
  backlog: 0,
  in_progress: 0,
  done: 0,
  total: 0,
});

export const useStoreEnvironments = (
  storeId: string | null | undefined,
): UseStoreEnvironmentsResult => {
  const { getStoreState, subscribeStoreEnvironments } = useEnvironmentRealtimeContext();

  useEffect(() => {
    if (!storeId) {
      return;
    }

    return subscribeStoreEnvironments(storeId);
  }, [storeId, subscribeStoreEnvironments]);

  const state = storeId ? getStoreState(storeId) : undefined;
  const environments = useMemo(() => state?.value ?? [], [state?.value]);
  const isLoading = storeId ? (state?.isLoading ?? true) : false;

  const statusCounts = useMemo(() => {
    if (environments.length === 0) {
      return buildEmptyCounts();
    }

    const counts: StatusCounts = buildEmptyCounts();
    counts.total = environments.length;
    environments.forEach((environment) => {
      counts[environment.status] += 1;
    });

    return counts;
  }, [environments]);

  return {
    environments,
    isLoading,
    statusCounts,
  };
};
