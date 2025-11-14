import type { AuthUser } from '../entities/AuthUser';
import { DEFAULT_ROLE } from '../entities/Role';
import { IAuthRepository } from '../repositories/AuthRepository';

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
}

export class RegisterUser {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: RegisterUserInput): Promise<AuthUser> {
    const payload = {
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      role: DEFAULT_ROLE
    };

    return this.authRepository.register(payload);
  }
}
