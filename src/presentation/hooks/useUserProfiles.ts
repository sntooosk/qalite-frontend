import { useEffect, useMemo, useState } from 'react';

import type { UserSummary } from '../../domain/entities/UserSummary';
import { userService } from '../../main/factories/userServiceFactory';

export const useUserProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<UserSummary[]>([]);

  const normalizedIdsKey = useMemo(() => {
    const normalized = Array.from(new Set(userIds.filter((id) => Boolean(id)))).sort();
    return normalized.join('|');
  }, [userIds]);

  useEffect(() => {
    if (!normalizedIdsKey) {
      setProfiles([]);
      return;
    }

    let isCancelled = false;
    const idsToLoad = normalizedIdsKey.split('|');

    const fetchProfiles = async () => {
      try {
        const summaries = await userService.getSummariesByIds(idsToLoad);
        if (!isCancelled) {
          setProfiles(summaries);
        }
      } catch (error) {
        console.error('Failed to load user profiles', error);
        if (!isCancelled) {
          setProfiles([]);
        }
      }
    };

    void fetchProfiles();

    return () => {
      isCancelled = true;
    };
  }, [normalizedIdsKey]);

  return profiles;
};
