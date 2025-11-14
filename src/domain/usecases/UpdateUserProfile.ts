import type { AuthUser } from '../entities/AuthUser';
import { IAuthRepository, UpdateProfilePayload } from '../repositories/AuthRepository';

export class UpdateUserProfile {
  constructor(private readonly authRepository: IAuthRepository) {}

  execute(payload: UpdateProfilePayload): Promise<AuthUser> {
    return this.authRepository.updateProfile(payload);
  }
}
