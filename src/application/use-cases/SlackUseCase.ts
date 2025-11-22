import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import { slackIntegrationRepository } from '../../infrastructure/repositories/firebaseSlackRepository';

export type SlackService = SlackRepository;

export const createSlackService = (repository: SlackRepository): SlackService => repository;

export const slackService = createSlackService(slackIntegrationRepository);
