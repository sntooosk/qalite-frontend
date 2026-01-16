import type {
  CreateTestQueueExecutionPayload,
  TestQueueCapacity,
  TestQueueExecution,
} from '../entities/testQueue';

export interface TestQueueRepository {
  createExecution: (payload: CreateTestQueueExecutionPayload) => Promise<void>;
  subscribeToQueue: (listener: (executions: TestQueueExecution[]) => void) => () => void;
  subscribeToCapacity: (listener: (capacity: TestQueueCapacity) => void) => () => void;
}
