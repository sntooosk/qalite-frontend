import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { UserSummaryDTO } from '../dto/user';

export class UserUseCases {
  constructor(private readonly userRepository: UserRepository) {}

  getSummariesByIds(ids: string[]): Promise<UserSummaryDTO[]> {
    return this.userRepository.getSummariesByIds(ids);
  }
}
