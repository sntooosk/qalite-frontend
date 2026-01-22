import { useCallback, useMemo } from 'react';

import type { UserSummary } from '../../domain/entities/user';
import { userService } from '../../application/use-cases/UserUseCase';
import { useResource } from './useResource';

export const useUserProfiles = (userIds: string[]) => {
  const uniqueIds = useMemo(() => Array.from(new Set(userIds)).sort(), [userIds]);
  const resourceKey = uniqueIds.length > 0 ? uniqueIds.join('|') : null;

  const fetchProfiles = useCallback(async () => {
    if (uniqueIds.length === 0) {
      return [];
    }
    return userService.getSummariesByIds(uniqueIds);
  }, [uniqueIds]);

  const {
    value: profiles,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setValue,
    patchValue,
  } = useResource<UserSummary[]>({
    resourceId: resourceKey,
    getInitialValue: () => [],
    fetch: async () => fetchProfiles(),
  });

  return {
    data: profiles,
    profiles,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setProfiles: setValue,
    patchProfiles: patchValue,
  };
};
