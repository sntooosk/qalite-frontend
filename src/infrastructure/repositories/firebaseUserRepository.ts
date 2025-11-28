import type { UserRepository } from '../../domain/repositories/UserRepository';
import { getAllUserSummaries, getUserSummariesByIds } from '../external/users';

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
  listAllSummaries: getAllUserSummaries,
};
