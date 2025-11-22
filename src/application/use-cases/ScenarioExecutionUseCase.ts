import type { ScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';
import { firebaseScenarioExecutionRepository } from '../../infrastructure/repositories/firebaseScenarioExecutionRepository';

export type ScenarioExecutionService = ScenarioExecutionRepository;

export const createScenarioExecutionService = (
  repository: ScenarioExecutionRepository,
): ScenarioExecutionService => repository;

export const scenarioExecutionService = createScenarioExecutionService(
  firebaseScenarioExecutionRepository,
);
