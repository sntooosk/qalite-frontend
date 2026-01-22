import type { EnvironmentTimeTracking } from '../../domain/entities/environment';

interface DateTimeFormatOptions {
  locale?: string;
  emptyLabel?: string;
}

export const formatDateTime = (
  value: string | null | undefined,
  options?: DateTimeFormatOptions,
): string => {
  const emptyLabel = options?.emptyLabel ?? 'Não registrado';

  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emptyLabel;
  }

  return date.toLocaleString(options?.locale ?? 'pt-BR', {
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

interface EndDateTimeFormatOptions extends DateTimeFormatOptions {
  inProgressLabel?: string;
  notEndedLabel?: string;
}

export const formatEndDateTime = (
  timeTracking: EnvironmentTimeTracking | null | undefined,
  isRunning: boolean,
  options?: EndDateTimeFormatOptions,
): string => {
  if (timeTracking?.end) {
    return formatDateTime(timeTracking.end, options);
  }

  return isRunning
    ? (options?.inProgressLabel ?? 'Em andamento')
    : (options?.notEndedLabel ?? 'Não encerrado');
};

export const formatDurationFromMs = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};
