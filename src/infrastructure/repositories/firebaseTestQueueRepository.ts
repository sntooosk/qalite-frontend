import type { TestQueueRepository } from '../../domain/repositories/TestQueueRepository';
import {
  createTestQueueExecution,
  subscribeToCapacity,
  subscribeToQueue,
} from '../external/testQueue';

export const firebaseTestQueueRepository: TestQueueRepository = {
  createExecution: createTestQueueExecution,
  subscribeToQueue,
  subscribeToCapacity,
};
