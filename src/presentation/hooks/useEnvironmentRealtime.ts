import { useEffect } from 'react';

import { useEnvironmentRealtimeContext } from '../context/EnvironmentRealtimeContext';

export const useEnvironmentRealtime = (environmentId: string | null | undefined) => {
  const { getEnvironmentState, subscribeEnvironment } = useEnvironmentRealtimeContext();

  useEffect(() => {
    if (!environmentId) {
      return;
    }

    return subscribeEnvironment(environmentId);
  }, [environmentId, subscribeEnvironment]);

  if (!environmentId) {
    return { environment: null, isLoading: false, error: 'Ambiente não encontrado.' };
  }

  const state = getEnvironmentState(environmentId);

  return {
    environment: state?.value ?? null,
    isLoading: state?.isLoading ?? true,
    error: state?.error ?? null,
  };
};
