import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Environment } from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';
import { getEnvironmentCached } from '../../infrastructure/external/environments';

export const useEnvironmentRealtime = (environmentId: string | null | undefined) => {
  const subscribeToEnvironment = useCallback(
    (id: string, handler: (environment: Environment | null) => void) =>
      environmentService.observeEnvironment(id, handler),
    [],
  );

  const cachedEnvironment = useMemo(
    () => (environmentId ? getEnvironmentCached(environmentId) : null),
    [environmentId],
  );
  const [environment, setEnvironment] = useState<Environment | null>(cachedEnvironment);
  const [isLoading, setIsLoading] = useState(Boolean(environmentId) && !cachedEnvironment);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!environmentId) {
      setEnvironment(null);
      setIsLoading(false);
      setError('Ambiente não encontrado.');
      return;
    }

    let isMounted = true;
    setEnvironment(cachedEnvironment);
    setIsLoading(!cachedEnvironment);
    setError(null);

    const unsubscribe = subscribeToEnvironment(environmentId, (nextValue) => {
      if (!isMounted) {
        return;
      }
      setEnvironment(nextValue);
      setIsLoading(false);
      setError(nextValue ? null : 'Ambiente não encontrado.');
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [cachedEnvironment, environmentId, subscribeToEnvironment]);

  return { environment, isLoading, error };
};
