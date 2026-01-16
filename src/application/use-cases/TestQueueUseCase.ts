import type { TestQueueRepository } from '../../domain/repositories/TestQueueRepository';
import type {
  CreateTestQueueExecutionPayload,
  TestQueueCapacity,
  TestQueueExecution,
} from '../../domain/entities/testQueue';
import { firebaseTestQueueRepository } from '../../infrastructure/repositories/firebaseTestQueueRepository';

export class TestQueueUseCases {
  constructor(private readonly testQueueRepository: TestQueueRepository) {}

  createExecution(payload: CreateTestQueueExecutionPayload): Promise<void> {
    return this.testQueueRepository.createExecution(payload);
  }

  subscribeToQueue(listener: (executions: TestQueueExecution[]) => void): () => void {
    return this.testQueueRepository.subscribeToQueue(listener);
  }

  subscribeToCapacity(listener: (capacity: TestQueueCapacity) => void): () => void {
    return this.testQueueRepository.subscribeToCapacity(listener);
  }
}

export const testQueueService = new TestQueueUseCases(firebaseTestQueueRepository);
