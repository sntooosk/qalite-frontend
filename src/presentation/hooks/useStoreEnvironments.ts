import { useCallback, useMemo } from 'react';

import type { Environment, EnvironmentStatus } from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { useResource } from './useResource';

interface StatusCounts extends Record<EnvironmentStatus, number> {
  total: number;
}

interface UseStoreEnvironmentsResult {
  environments: Environment[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  statusCounts: StatusCounts;
  refetch: () => Promise<void>;
  updatedAt: number | null;
  setEnvironments: (value: Environment[] | ((previous: Environment[]) => Environment[])) => void;
  patchEnvironments: (updater: (previous: Environment[]) => Environment[]) => void;
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
  const fetchEnvironments = useCallback(
    async (id: string) => environmentService.getAll({ storeId: id }),
    [],
  );

  const {
    value: environments,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setValue,
    patchValue,
  } = useResource<Environment[]>({
    resourceId: storeId,
    getInitialValue: () => [],
    fetch: fetchEnvironments,
  });

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
    data: environments,
    environments,
    isLoading,
    isFetching,
    error,
    statusCounts,
    refetch,
    updatedAt,
    setEnvironments: setValue,
    patchEnvironments: patchValue,
  };
};
