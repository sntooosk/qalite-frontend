import {
  firebaseAuthRepository,
  firebaseEnvironmentRepository,
  firebaseLogRepository,
  firebaseOrganizationRepository,
  firebaseScenarioExecutionRepository,
  firebaseStoreRepository,
  firebaseUserRepository,
  slackIntegrationRepository,
} from '../../infrastructure/repositories/firebaseRepositories';
import { AuthUseCases } from './authUseCases';
import { EnvironmentUseCases } from './environmentUseCases';
import { OrganizationUseCases } from './organizationUseCases';
import { StoreUseCases } from './storeUseCases';
import { UserUseCases } from './userUseCases';
import { ScenarioExecutionUseCases } from './scenarioExecutionUseCases';
import { SlackUseCases } from './slackUseCases';
import { LogUseCases } from './logUseCases';

export const authUseCases = new AuthUseCases(firebaseAuthRepository);
export const environmentUseCases = new EnvironmentUseCases(firebaseEnvironmentRepository);
export const organizationUseCases = new OrganizationUseCases(firebaseOrganizationRepository);
export const storeUseCases = new StoreUseCases(firebaseStoreRepository);
export const userUseCases = new UserUseCases(firebaseUserRepository);
export const scenarioExecutionUseCases = new ScenarioExecutionUseCases(
  firebaseScenarioExecutionRepository,
);
export const slackUseCases = new SlackUseCases(slackIntegrationRepository);
export const logUseCases = new LogUseCases(firebaseLogRepository);

// Backwards compatibility for presentation layer naming
export const authService = authUseCases;
export const environmentService = environmentUseCases;
export const organizationService = organizationUseCases;
export const storeService = storeUseCases;
export const userService = userUseCases;
export const scenarioExecutionService = scenarioExecutionUseCases;
export const slackService = slackUseCases;
export const logService = logUseCases;
