import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { firebaseAuthRepository } from '../../infrastructure/repositories/firebaseAuthRepository';

export type AuthService = AuthRepository;

export const createAuthService = (repository: AuthRepository): AuthService => repository;

export const authService = createAuthService(firebaseAuthRepository);
