import { useCallback } from 'react';

import type { Environment } from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { useResource } from './useResource';

export const useEnvironmentResource = (environmentId: string | null | undefined) => {
  const fetchEnvironment = useCallback((id: string) => environmentService.getEnvironment(id), []);

  const { value, isLoading, error, refetch } = useResource<Environment | null>({
    resourceId: environmentId,
    getInitialValue: () => null,
    fetch: fetchEnvironment,
    missingResourceMessage: 'Ambiente não encontrado.',
  });

  return { environment: value, isLoading, error, refetch };
};
