import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResourceOptions<T> {
  resourceId?: string | null;
  getInitialValue: () => T;
  fetch: (resourceId: string) => Promise<T>;
  missingResourceMessage?: string;
}

export const useResource = <T>({
  resourceId,
  getInitialValue,
  fetch,
  missingResourceMessage,
}: UseResourceOptions<T>) => {
  const initialValueRef = useRef<T>();

  if (initialValueRef.current === undefined) {
    initialValueRef.current = getInitialValue();
  }

  const [value, setValue] = useState<T>(initialValueRef.current!);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(resourceId));
  const [error, setError] = useState<string | null>(null);

  const fetchResource = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextValue = await fetch(id);
        setValue(nextValue);
        return nextValue;
      } catch (error) {
        void error;
        setError(error instanceof Error ? error.message : 'Falha ao carregar dados.');
        return initialValueRef.current!;
      } finally {
        setIsLoading(false);
      }
    },
    [fetch],
  );

  useEffect(() => {
    if (!resourceId) {
      setValue(initialValueRef.current!);
      setIsLoading(false);
      setError(missingResourceMessage ?? null);
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

  return { value, isLoading, error, refetch };
};
