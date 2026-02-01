import { useEffect, useMemo, useState } from 'react';

import type { UserSummary } from '../../domain/entities/user';
import { userService } from '../../infrastructure/services/userService';

export const useUserProfiles = (userIds: string[]) => {
  const [profiles, setProfiles] = useState<UserSummary[]>([]);
  const idsKey = useMemo(() => Array.from(new Set(userIds)).sort().join('|'), [userIds]);

  useEffect(() => {
    let isMounted = true;
    const uniqueIds = idsKey ? idsKey.split('|') : [];

    if (uniqueIds.length === 0) {
      setProfiles([]);
      return () => {
        isMounted = false;
      };
    }

    const fetchProfiles = async () => {
      try {
        const summaries = await userService.getSummariesByIds(uniqueIds);
        if (isMounted) {
          setProfiles(summaries);
        }
      } catch (error) {
        console.error('Failed to load user profiles', error);
      }
    };

    void fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [idsKey]);

  return profiles;
};
