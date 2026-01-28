import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EnvironmentBug } from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';

export const useEnvironmentBugs = (environmentId: string | null | undefined) => {
  const { t } = useTranslation();
  const [bugs, setBugs] = useState<EnvironmentBug[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(environmentId));
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = useCallback(async () => {
    if (!environmentId) {
      setBugs([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const list = await environmentService.listBugs(environmentId);
      setBugs(list);
    } catch (fetchError) {
      console.error(fetchError);
      setBugs([]);
      setError(t('environmentBugList.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [environmentId, t]);

  useEffect(() => {
    void fetchBugs();
  }, [fetchBugs]);

  return { bugs, isLoading, error, refetch: fetchBugs };
};
