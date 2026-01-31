import { EnvironmentUseCases } from '../../application/use-cases/EnvironmentUseCase';
import { firebaseEnvironmentRepository } from '../repositories/firebaseEnvironmentRepository';

export const environmentService = new EnvironmentUseCases(firebaseEnvironmentRepository);
