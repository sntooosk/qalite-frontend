import type { UserRepository } from '../../domain/repositories/UserRepository';
import { getUserSummariesByIds, listUserSummaries } from '../external/users';

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
  listAll: listUserSummaries,
};
