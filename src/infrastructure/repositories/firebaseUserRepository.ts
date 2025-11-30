import type { UserRepository } from '../../domain/repositories/UserRepository';
import { getUserSummariesByIds, listAllUserSummaries } from '../external/users';

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
  listAllSummaries: listAllUserSummaries,
};
