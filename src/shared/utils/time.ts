import type { EnvironmentTimeTracking } from '../../domain/entities/environment';
import i18n from '../../lib/i18n';

const getTimeTranslation = (key: string) => i18n.t(key);
const getLocale = () => i18n.language || 'pt-BR';

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return getTimeTranslation('time.notRecorded');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return getTimeTranslation('time.notRecorded');
  }

  return date.toLocaleString(getLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export const getElapsedMilliseconds = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
  currentTimestamp = Date.now(),
): number => {
  if (!timeTracking) {
    return 0;
  }

  if (isRunning && timeTracking.start) {
    const startedAt = new Date(timeTracking.start).getTime();
    return timeTracking.totalMs + Math.max(0, currentTimestamp - startedAt);
  }

  return timeTracking.totalMs;
};

export const formatEndDateTime = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
): string => {
  if (timeTracking?.end) {
    return formatDateTime(timeTracking.end);
  }

  return isRunning ? getTimeTranslation('time.inProgress') : getTimeTranslation('time.notFinished');
};

export const formatDurationFromMs = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};
