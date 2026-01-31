import { AuthUseCases } from '../../application/use-cases/AuthUseCase';
import { firebaseAuthRepository } from '../repositories/firebaseAuthRepository';

export const authService = new AuthUseCases(firebaseAuthRepository);
