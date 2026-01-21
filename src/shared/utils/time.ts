import type { EnvironmentTimeTracking } from '../../domain/entities/environment';

export type EnvironmentMomentKey = 'pre' | 'post';

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return 'Não registrado';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Não registrado';
  }

  return date.toLocaleString('pt-BR', {
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

  return isRunning ? 'Em andamento' : 'Não encerrado';
};

export const formatDurationFromMs = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export const buildEmptyTimeTracking = (): EnvironmentTimeTracking => ({
  start: null,
  end: null,
  totalMs: 0,
});

export const startTimeTracking = (
  current: EnvironmentTimeTracking,
  nowIso: string = new Date().toISOString(),
): EnvironmentTimeTracking => ({
  start: current.start ?? nowIso,
  end: null,
  totalMs: current.totalMs,
});

export const finalizeTimeTracking = (
  current: EnvironmentTimeTracking,
  nowIso: string = new Date().toISOString(),
  nowTimestamp: number = Date.now(),
): EnvironmentTimeTracking => {
  const startTimestamp = current.start ? new Date(current.start).getTime() : nowTimestamp;
  const totalMs = current.totalMs + Math.max(0, nowTimestamp - startTimestamp);
  return {
    start: current.start ?? nowIso,
    end: nowIso,
    totalMs,
  };
};

export const resolveEnvironmentMomentKey = (
  moment: string | null | undefined,
): EnvironmentMomentKey | null => {
  if (!moment) {
    return null;
  }

  const normalized = moment.toLowerCase();
  if (normalized.endsWith('.pre') || normalized === 'pre') {
    return 'pre';
  }

  if (normalized.endsWith('.post') || normalized === 'post') {
    return 'post';
  }

  return null;
};

export const normalizeMomentTimeTracking = (
  value?: Partial<Record<EnvironmentMomentKey, EnvironmentTimeTracking>> | null,
): Record<EnvironmentMomentKey, EnvironmentTimeTracking> => ({
  pre: value?.pre ?? buildEmptyTimeTracking(),
  post: value?.post ?? buildEmptyTimeTracking(),
});
