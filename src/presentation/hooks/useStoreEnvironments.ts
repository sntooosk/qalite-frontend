import { useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';

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
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(storeId));

  useEffect(() => {
    if (!storeId) {
      setEnvironments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    const loadEnvironments = async () => {
      try {
        const list = await environmentService.listSummary({ storeId });
        if (isMounted) {
          setEnvironments(list);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setEnvironments([]);
          setIsLoading(false);
        }
      }
    };

    void loadEnvironments();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

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
