import { SlackUseCases } from '../../application/use-cases/SlackUseCase';
import { slackIntegrationRepository } from '../repositories/firebaseSlackRepository';

export const slackService = new SlackUseCases(slackIntegrationRepository);
