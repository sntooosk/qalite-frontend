import { BrowserstackUseCases } from '../../application/use-cases/BrowserstackUseCase';
import { browserstackIntegrationRepository } from '../repositories/browserstackIntegrationRepository';

export const browserstackService = new BrowserstackUseCases(browserstackIntegrationRepository);
