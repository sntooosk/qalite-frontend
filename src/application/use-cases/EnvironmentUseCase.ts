import type { EnvironmentRepository } from '../../domain/repositories/EnvironmentRepository';
import { firebaseEnvironmentRepository } from '../../infrastructure/repositories/firebaseEnvironmentRepository';

export type EnvironmentService = EnvironmentRepository;

export const createEnvironmentService = (repository: EnvironmentRepository): EnvironmentService =>
  repository;

export const environmentService = createEnvironmentService(firebaseEnvironmentRepository);
