import { useEffect, useMemo, useState } from 'react';

import type { EnvironmentTimeTracking } from '../../domain/entities/environment';
import {
  formatDateTime,
  formatDurationFromMs,
  formatEndDateTime,
  getElapsedMilliseconds,
} from '../../shared/utils/time';
import type { TFunction } from 'i18next';

interface UseTimeTrackingOptions {
  translation?: TFunction;
  locale?: string;
}

export const useTimeTracking = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
  options?: UseTimeTrackingOptions,
) => {
  const [now, setNow] = useState(() => Date.now());
  const translation = options?.translation;
  const locale = options?.locale;

  useEffect(() => {
    if (!isRunning || !timeTracking?.start) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, timeTracking?.start]);

  const totalMs = useMemo(
    () => getElapsedMilliseconds(timeTracking, isRunning, now),
    [isRunning, now, timeTracking],
  );

  return {
    totalMs,
    formattedTime: formatDurationFromMs(totalMs),
    formattedStart: formatDateTime(timeTracking?.start ?? null, {
      locale,
      emptyLabel: translation?.('environmentSummary.notRecorded'),
    }),
    formattedEnd: formatEndDateTime(timeTracking, isRunning, {
      locale,
      emptyLabel: translation?.('environmentSummary.notRecorded'),
      inProgressLabel: translation?.('environmentSummary.inProgress'),
      notEndedLabel: translation?.('environmentSummary.notEnded'),
    }),
  };
};
