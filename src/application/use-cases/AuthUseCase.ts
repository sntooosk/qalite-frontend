import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type {
  AuthUser,
  AuthStateListener,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../domain/entities/auth';
import { firebaseAuthRepository } from '../../infrastructure/repositories/firebaseAuthRepository';

export class AuthUseCases {
  constructor(private readonly authRepository: AuthRepository) {}

  register(payload: RegisterPayload): Promise<AuthUser> {
    return this.authRepository.register(payload);
  }

  login(payload: LoginPayload): Promise<AuthUser> {
    return this.authRepository.login(payload);
  }

  logout(): Promise<void> {
    return this.authRepository.logout();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.authRepository.sendPasswordReset(email);
  }

  getCurrent(): Promise<AuthUser | null> {
    return this.authRepository.getCurrent();
  }

  ensurePersistence(): Promise<void> {
    return this.authRepository.ensurePersistence();
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    return this.authRepository.onAuthStateChanged(listener);
  }

  hasRequiredRole(user: AuthUser | null, allowedRoles: AuthUser['role'][]): boolean {
    return this.authRepository.hasRequiredRole(user, allowedRoles);
  }

  updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    return this.authRepository.updateProfile(payload);
  }
}

export const authService = new AuthUseCases(firebaseAuthRepository);
