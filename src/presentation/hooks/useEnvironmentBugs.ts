import { useCallback } from 'react';

import type { EnvironmentBug } from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { useResource } from './useResource';

export const useEnvironmentBugs = (environmentId: string | null | undefined) => {
  const fetchBugs = useCallback((id: string) => environmentService.getBugs(id), []);

  const { value, isLoading, isFetching, error, refetch, updatedAt, setValue, patchValue } =
    useResource<EnvironmentBug[]>({
      resourceId: environmentId,
      getInitialValue: () => [],
      fetch: fetchBugs,
    });

  return {
    data: value,
    bugs: value,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setBugs: setValue,
    patchBugs: patchValue,
  };
};
