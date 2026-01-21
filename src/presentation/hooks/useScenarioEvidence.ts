import { useCallback, useState } from 'react';

import type {
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';

interface UseScenarioEvidenceOptions {
  onUpdated?: () => void | Promise<void>;
}

export const useScenarioEvidence = (
  environmentId: string | null | undefined,
  options: UseScenarioEvidenceOptions = {},
) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { onUpdated } = options;

  const handleEvidenceUpload = useCallback(
    async (scenarioId: string, link: string) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        const result = await environmentService.uploadScenarioEvidence(
          environmentId,
          scenarioId,
          link,
        );
        await onUpdated?.();
        return result;
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId, onUpdated],
  );

  const changeScenarioStatus = useCallback(
    async (
      scenarioId: string,
      status: EnvironmentScenarioStatus,
      platform: EnvironmentScenarioPlatform,
    ) => {
      if (!environmentId) {
        throw new Error('Ambiente inválido.');
      }

      setIsUpdating(true);
      try {
        await environmentService.updateScenarioStatus(environmentId, scenarioId, status, platform);
        await onUpdated?.();
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId, onUpdated],
  );

  return { isUpdating, handleEvidenceUpload, changeScenarioStatus };
};
