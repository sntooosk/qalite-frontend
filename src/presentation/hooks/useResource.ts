import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResourceOptions<T> {
  resourceId?: string | null;
  getInitialValue: () => T;
  fetch: (resourceId: string) => Promise<T>;
  missingResourceMessage?: string;
  minimumLoadingMs?: number;
}

export const useResource = <T>({
  resourceId,
  getInitialValue,
  fetch,
  missingResourceMessage,
  minimumLoadingMs = 200,
}: UseResourceOptions<T>) => {
  const initialValueRef = useRef<T>();
  const mountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);

  if (initialValueRef.current === undefined) {
    initialValueRef.current = getInitialValue();
  }

  const [value, setValue] = useState<T>(initialValueRef.current!);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(resourceId));
  const [isFetching, setIsFetching] = useState<boolean>(Boolean(resourceId));
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const fetchResource = useCallback(
    async (id: string) => {
      const startTime = Date.now();
      if (mountedRef.current) {
        setIsFetching(true);
        if (!hasLoadedOnceRef.current) {
          setIsLoading(true);
        }
        setError(null);
      }

      try {
        const nextValue = await fetch(id);
        if (mountedRef.current) {
          setValue(nextValue);
          setUpdatedAt(Date.now());
        }
        return nextValue;
      } catch (error) {
        void error;
        if (mountedRef.current) {
          setError(error instanceof Error ? error.message : 'Falha ao carregar dados.');
        }
        return initialValueRef.current!;
      } finally {
        const elapsed = Date.now() - startTime;
        if (elapsed < minimumLoadingMs) {
          await new Promise((resolve) => setTimeout(resolve, minimumLoadingMs - elapsed));
        }
        if (mountedRef.current) {
          setIsFetching(false);
          setIsLoading(false);
        }
        hasLoadedOnceRef.current = true;
      }
    },
    [fetch, minimumLoadingMs],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!resourceId) {
      if (mountedRef.current) {
        setValue(initialValueRef.current!);
        setIsLoading(false);
        setIsFetching(false);
        setError(missingResourceMessage ?? null);
      }
      return;
    }

    void fetchResource(resourceId);
  }, [resourceId, fetchResource, missingResourceMessage]);

  const refetch = useCallback(async () => {
    if (!resourceId) {
      return;
    }

    await fetchResource(resourceId);
  }, [fetchResource, resourceId]);

  const patchValue = useCallback((updater: (previous: T) => T) => {
    if (!mountedRef.current) {
      return;
    }
    setValue((previous) => updater(previous));
  }, []);

  return { value, isLoading, isFetching, error, refetch, updatedAt, setValue, patchValue };
};
