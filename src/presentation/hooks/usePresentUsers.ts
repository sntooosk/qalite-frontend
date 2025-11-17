import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { useAuth } from './useAuth';

interface UsePresentUsersParams {
  environmentId: string | null | undefined;
  presentUsersIds: string[];
  status: EnvironmentStatus | null | undefined;
  shouldAutoJoin?: boolean;
}

export const usePresentUsers = ({
  environmentId,
  presentUsersIds,
  status,
  shouldAutoJoin = true,
}: UsePresentUsersParams) => {
  const { user } = useAuth();
  const hasJoinedRef = useRef(false);
  const statusRef = useRef<EnvironmentStatus | null | undefined>(status);

  statusRef.current = status;

  const isEnvironmentLocked = status === 'done';
  const canLeaveByStatus = status ? ['backlog', 'in_progress'].includes(status) : false;
  const isCurrentUserPresent = useMemo(
    () => (user?.uid ? presentUsersIds.includes(user.uid) : false),
    [presentUsersIds, user?.uid],
  );

  useEffect(() => {
    hasJoinedRef.current = isCurrentUserPresent;
  }, [isCurrentUserPresent]);

  const joinEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || isEnvironmentLocked || hasJoinedRef.current) {
      return;
    }

    try {
      await environmentService.addUser(environmentId, user.uid);
      hasJoinedRef.current = true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [environmentId, isEnvironmentLocked, user?.uid]);

  const leaveEnvironment = useCallback(async () => {
    if (!environmentId || !user?.uid || !hasJoinedRef.current) {
      return;
    }

    if (!canLeaveByStatus || statusRef.current === 'done') {
      throw new Error('Não é possível sair deste ambiente no status atual.');
    }

    try {
      await environmentService.removeUser(environmentId, user.uid);
      hasJoinedRef.current = false;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [canLeaveByStatus, environmentId, user?.uid]);

  useEffect(() => {
    if (!environmentId || !user?.uid || isEnvironmentLocked || !shouldAutoJoin) {
      return undefined;
    }

    void joinEnvironment().catch(() => undefined);
    return () => {
      if (hasJoinedRef.current && canLeaveByStatus) {
        void leaveEnvironment().catch(() => undefined);
      }
    };
  }, [
    canLeaveByStatus,
    environmentId,
    isEnvironmentLocked,
    joinEnvironment,
    leaveEnvironment,
    shouldAutoJoin,
    user?.uid,
  ]);

  const canLeaveEnvironment = isCurrentUserPresent && canLeaveByStatus;

  return { isCurrentUserPresent, canLeaveEnvironment, joinEnvironment, leaveEnvironment };
};
