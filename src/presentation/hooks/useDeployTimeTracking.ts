import { useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentTimeTracking } from '../../domain/entities/environment';
import {
  formatDateTime,
  formatDurationFromMs,
  formatEndDateTime,
  getElapsedMilliseconds,
  buildEmptyTimeTracking,
  normalizeMomentTimeTracking,
  resolveEnvironmentMomentKey,
} from '../../shared/utils/time';

const buildSummary = (timeTracking: EnvironmentTimeTracking, isRunning: boolean, now: number) => {
  const totalMs = getElapsedMilliseconds(timeTracking, isRunning, now);
  return {
    totalMs,
    formattedTime: formatDurationFromMs(totalMs),
    formattedStart: formatDateTime(timeTracking?.start ?? null),
    formattedEnd: formatEndDateTime(timeTracking, isRunning),
  };
};

const getEarliestStart = (values: Array<string | null | undefined>) => {
  const starts = values.filter((value): value is string => Boolean(value));
  if (starts.length === 0) {
    return null;
  }

  return starts.sort((first, second) => new Date(first).getTime() - new Date(second).getTime())[0];
};

const getLatestEnd = (values: Array<string | null | undefined>) => {
  const ends = values.filter((value): value is string => Boolean(value));
  if (ends.length === 0) {
    return null;
  }

  return ends.sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];
};

export const useDeployTimeTracking = (environment: Environment | null | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  const momentKey = resolveEnvironmentMomentKey(environment?.momento);
  const isRunning = environment?.status === 'in_progress';
  const baseTracking = environment?.timeTracking ?? buildEmptyTimeTracking();

  const momentTimeTracking = useMemo(() => {
    const normalized = normalizeMomentTimeTracking(environment?.momentTimeTracking ?? null);
    if (momentKey && !environment?.momentTimeTracking && environment?.timeTracking) {
      return {
        ...normalized,
        [momentKey]: environment.timeTracking,
      };
    }
    return normalized;
  }, [environment?.momentTimeTracking, environment?.timeTracking, momentKey]);

  useEffect(() => {
    const activeTracking = momentKey ? momentTimeTracking[momentKey] : baseTracking;

    if (!isRunning || !activeTracking?.start) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [baseTracking, isRunning, momentKey, momentTimeTracking]);

  const baseSummary = useMemo(
    () => buildSummary(baseTracking, isRunning, now),
    [baseTracking, isRunning, now],
  );

  const preSummary = useMemo(
    () => buildSummary(momentTimeTracking.pre, isRunning && momentKey === 'pre', now),
    [isRunning, momentKey, momentTimeTracking.pre, now],
  );

  const postSummary = useMemo(
    () => buildSummary(momentTimeTracking.post, isRunning && momentKey === 'post', now),
    [isRunning, momentKey, momentTimeTracking.post, now],
  );

  const totalMs = momentKey ? preSummary.totalMs + postSummary.totalMs : baseSummary.totalMs;
  const combinedTracking: EnvironmentTimeTracking = momentKey
    ? {
        start: getEarliestStart([momentTimeTracking.pre.start, momentTimeTracking.post.start]),
        end: isRunning
          ? null
          : getLatestEnd([momentTimeTracking.pre.end, momentTimeTracking.post.end]),
        totalMs,
      }
    : {
        start: baseTracking.start,
        end: baseTracking.end,
        totalMs,
      };

  return {
    pre: preSummary,
    post: postSummary,
    total: {
      totalMs,
      formattedTime: formatDurationFromMs(totalMs),
    },
    formattedStart: momentKey
      ? formatDateTime(combinedTracking.start ?? null)
      : baseSummary.formattedStart,
    formattedEnd: momentKey
      ? formatEndDateTime(combinedTracking, isRunning)
      : baseSummary.formattedEnd,
    momentKey,
  };
};
