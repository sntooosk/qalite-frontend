import { EnvironmentUseCases } from '../../application/use-cases/EnvironmentUseCase';
import { firebaseEnvironmentRepository } from '../repositories/firebaseEnvironmentRepository';
import { cacheStore } from './cacheStore';

export const environmentService = new EnvironmentUseCases(
  firebaseEnvironmentRepository,
  cacheStore,
);
