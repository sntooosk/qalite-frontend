import type {
  CreateScenarioExecutionInput,
  ScenarioExecution,
} from '../entities/ScenarioExecution';

export interface IScenarioExecutionRepository {
  create(payload: CreateScenarioExecutionInput): Promise<void>;
  listByOrganization(organizationId: string): Promise<ScenarioExecution[]>;
  listByStore(storeId: string): Promise<ScenarioExecution[]>;
}
