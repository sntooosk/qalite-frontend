import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  EnvironmentListCursor,
  EnvironmentStatus,
  EnvironmentSummary,
} from '../../domain/entities/environment';
import { environmentService } from '../../infrastructure/services/environmentService';

interface StatusCounts extends Record<EnvironmentStatus, number> {
  total: number;
}

interface UseStoreEnvironmentsResult {
  environments: EnvironmentSummary[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  statusCounts: StatusCounts;
}

const buildEmptyCounts = (): StatusCounts => ({
  backlog: 0,
  in_progress: 0,
  done: 0,
  total: 0,
});

export const useStoreEnvironments = (
  storeId: string | null | undefined,
): UseStoreEnvironmentsResult => {
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(storeId));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<EnvironmentListCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_LIMIT = 30;

  const sortByCreatedAt = useCallback((list: EnvironmentSummary[]) => {
    return [...list].sort((first, second) => {
      const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
      return secondDate - firstDate;
    });
  }, []);

  const mergeEnvironments = useCallback(
    (current: EnvironmentSummary[], next: EnvironmentSummary[]) => {
      const map = new Map(current.map((environment) => [environment.id, environment]));
      next.forEach((environment) => {
        map.set(environment.id, environment);
      });
      return sortByCreatedAt(Array.from(map.values()));
    },
    [sortByCreatedAt],
  );

  const loadPage = useCallback(
    async (nextCursor: EnvironmentListCursor | null, shouldAppend: boolean) => {
      if (!storeId) {
        return null;
      }

      const updateState = (pageItems: EnvironmentSummary[]) => {
        setEnvironments((current) =>
          shouldAppend ? mergeEnvironments(current, pageItems) : pageItems,
        );
      };

      const page = await environmentService.listSummary(
        { storeId, limit: PAGE_LIMIT, cursor: nextCursor ?? undefined },
        {
          onUpdate: (freshPage) => {
            updateState(freshPage.items);
            setCursor(freshPage.nextCursor);
            setHasMore(Boolean(freshPage.nextCursor));
          },
        },
      );

      updateState(page.items);
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
      return page;
    },
    [PAGE_LIMIT, mergeEnvironments, storeId],
  );

  const loadAllPages = useCallback(async () => {
    let nextCursor: EnvironmentListCursor | null = null;
    let shouldAppend = false;
    let isFirstPage = true;

    try {
      while (isFirstPage || nextCursor) {
        const page = await loadPage(nextCursor, shouldAppend);
        if (isFirstPage) {
          setIsLoading(false);
          isFirstPage = false;
        }
        nextCursor = page?.nextCursor ?? null;
        if (!nextCursor) {
          break;
        }
        shouldAppend = true;
      }
    } catch (error) {
      console.error('Failed to load environment summaries', error);
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    if (!storeId) {
      setEnvironments([]);
      setIsLoading(false);
      setIsLoadingMore(false);
      setCursor(null);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    void loadAllPages();
  }, [loadAllPages, storeId]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    void loadPage(cursor, true).finally(() => setIsLoadingMore(false));
  }, [cursor, hasMore, isLoadingMore, loadPage]);

  const statusCounts = useMemo(() => {
    if (environments.length === 0) {
      return buildEmptyCounts();
    }

    const counts: StatusCounts = buildEmptyCounts();
    counts.total = environments.length;
    environments.forEach((environment) => {
      counts[environment.status] += 1;
    });

    return counts;
  }, [environments]);

  return {
    environments,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    statusCounts,
  };
};
