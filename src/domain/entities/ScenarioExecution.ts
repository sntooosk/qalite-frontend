export interface ScenarioExecution {
  id: string;
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
  createdAt: string | null;
}

export interface CreateScenarioExecutionInput {
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
}
