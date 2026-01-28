import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../domain/entities/environment';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';

export const useScenarioEvidence = (environmentId: string | null | undefined) => {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEvidenceUpload = useCallback(
    async (scenarioId: string, link: string) => {
      if (!environmentId) {
        throw new Error(t('environmentEvidenceTable.invalidEnvironment'));
      }

      setIsUpdating(true);
      try {
        return await environmentService.uploadScenarioEvidence(environmentId, scenarioId, link);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId, t],
  );

  const changeScenarioStatus = useCallback(
    async (
      scenarioId: string,
      status: EnvironmentScenarioStatus,
      platform: EnvironmentScenarioPlatform,
    ) => {
      if (!environmentId) {
        throw new Error(t('environmentEvidenceTable.invalidEnvironment'));
      }

      setIsUpdating(true);
      try {
        await environmentService.updateScenarioStatus(environmentId, scenarioId, status, platform);
      } finally {
        setIsUpdating(false);
      }
    },
    [environmentId, t],
  );

  return { isUpdating, handleEvidenceUpload, changeScenarioStatus };
};
