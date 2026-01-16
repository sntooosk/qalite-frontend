export type TestQueueStatus = 'waiting' | 'running' | 'finished' | 'failed';

export interface TestQueueRequester {
  uid: string;
  displayName: string;
  email: string;
}

export interface TestQueueExecution {
  id: string;
  status: TestQueueStatus;
  testType: string;
  environment: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  requestedBy: TestQueueRequester;
  browserstackBuildId?: string | null;
  browserstackBuildUrl?: string | null;
  githubWorkflowRunId?: number | null;
}

export interface TestQueueCapacity {
  maxParallel: number;
  runningCount: number;
  updatedAt: string | null;
}

export interface CreateTestQueueExecutionPayload {
  testType: string;
  environment: string;
  projectId: string | null;
  projectName: string | null;
  requestedBy: TestQueueRequester;
}
