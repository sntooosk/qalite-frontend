export type SprintStatus = 'ativo' | 'encerrado';

export type TestCaseStatus = 'pendente' | 'executando' | 'concluido' | 'falhou';

export interface SprintTestCase {
  id: string;
  title: string;
  status: TestCaseStatus;
}

export type BugStatus = 'aberto' | 'fechado';

export interface SprintBug {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  createdAt: string;
}

export interface Sprint {
  id: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  environment: string;
  project: string;
  store: string;
  status: SprintStatus;
  notes: string;
  testCases: SprintTestCase[];
  bugs: SprintBug[];
  createdAt: string;
}

export interface CreateSprintPayload {
  name: string;
  startDate: string;
  endDate: string;
  environment: string;
  project: string;
  store: string;
}
