import { FirebaseAuthRepository } from '../../infra/repositories/FirebaseAuthRepository';
import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Role } from '../../domain/entities/Role';
import { GetCurrentUser } from '../../domain/usecases/GetCurrentUser';
import { LoginUser, LoginUserInput } from '../../domain/usecases/LoginUser';
import { LogoutUser } from '../../domain/usecases/LogoutUser';
import { ObserveAuthState } from '../../domain/usecases/ObserveAuthState';
import { RegisterUser, RegisterUserInput } from '../../domain/usecases/RegisterUser';
import { UpdateUserProfile } from '../../domain/usecases/UpdateUserProfile';
import type { UpdateProfilePayload } from '../../domain/repositories/AuthRepository';
import { ResetPassword } from '../../domain/usecases/ResetPassword';

const authRepository = new FirebaseAuthRepository();

export class AuthService {
  private readonly registerUser = new RegisterUser(authRepository);
  private readonly loginUser = new LoginUser(authRepository);
  private readonly logoutUser = new LogoutUser(authRepository);
  private readonly resetPassword = new ResetPassword(authRepository);
  private readonly getCurrentUser = new GetCurrentUser(authRepository);
  private readonly observeAuthState = new ObserveAuthState(authRepository);
  private readonly updateUserProfile = new UpdateUserProfile(authRepository);

  register(input: RegisterUserInput): Promise<AuthUser> {
    return this.registerUser.execute(input);
  }

  login(input: LoginUserInput): Promise<AuthUser> {
    return this.loginUser.execute(input);
  }

  logout(): Promise<void> {
    return this.logoutUser.execute();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.resetPassword.execute(email);
  }

  getCurrent(): Promise<AuthUser | null> {
    return this.getCurrentUser.execute();
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return this.observeAuthState.execute(listener);
  }

  hasRequiredRole(user: AuthUser | null, allowedRoles: Role[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  updateProfile(input: UpdateProfilePayload): Promise<AuthUser> {
    return this.updateUserProfile.execute(input);
  }
}

export const authService = new AuthService();
