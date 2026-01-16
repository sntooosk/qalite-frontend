import { useCallback, useEffect, useMemo, useState } from 'react';

import { testQueueService } from '../../application/use-cases/TestQueueUseCase';
import type {
  CreateTestQueueExecutionPayload,
  TestQueueCapacity,
  TestQueueExecution,
} from '../../domain/entities/testQueue';
import { useAuth } from './useAuth';

interface UseTestQueueState {
  executions: TestQueueExecution[];
  capacity: TestQueueCapacity;
  isLoading: boolean;
  createExecution: (payload: Omit<CreateTestQueueExecutionPayload, 'requestedBy'>) => Promise<void>;
}

const DEFAULT_CAPACITY: TestQueueCapacity = {
  maxParallel: 2,
  runningCount: 0,
  updatedAt: null,
};

export const useTestQueue = (): UseTestQueueState => {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<TestQueueExecution[]>([]);
  const [capacity, setCapacity] = useState<TestQueueCapacity>(DEFAULT_CAPACITY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeQueue = testQueueService.subscribeToQueue((items) => {
      setExecutions(items);
      setIsLoading(false);
    });

    const unsubscribeCapacity = testQueueService.subscribeToCapacity((nextCapacity) => {
      setCapacity(nextCapacity);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeCapacity();
    };
  }, []);

  const createExecution = useCallback(
    async (payload: Omit<CreateTestQueueExecutionPayload, 'requestedBy'>) => {
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }

      await testQueueService.createExecution({
        ...payload,
        requestedBy: {
          uid: user.uid,
          displayName: user.displayName || user.email,
          email: user.email,
        },
      });
    },
    [user],
  );

  return useMemo(
    () => ({
      executions,
      capacity,
      isLoading,
      createExecution,
    }),
    [capacity, createExecution, executions, isLoading],
  );
};
