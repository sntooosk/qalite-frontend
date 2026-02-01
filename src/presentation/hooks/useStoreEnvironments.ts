import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';

interface StatusCounts extends Record<EnvironmentStatus, number> {
  total: number;
}

interface UseStoreEnvironmentsResult {
  environments: Environment[];
  isLoading: boolean;
  statusCounts: StatusCounts;
  refresh: () => Promise<void>;
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
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(storeId));
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!storeId) {
      if (isMountedRef.current) {
        setEnvironments([]);
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const list = await environmentService.listSummary({ storeId });
      if (isMountedRef.current) {
        setEnvironments(list);
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      if (isMountedRef.current) {
        setEnvironments([]);
        setIsLoading(false);
      }
    }
  }, [storeId]);

  useEffect(() => {
    const load = async () => {
      await refresh();
    };
    void load();
  }, [refresh]);

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
    refresh,
  };
};
