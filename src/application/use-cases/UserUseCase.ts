import type { UserRepository } from '../../domain/repositories/UserRepository';
import { firebaseUserRepository } from '../../infrastructure/repositories/firebaseUserRepository';

export type UserService = UserRepository;

export const createUserService = (repository: UserRepository): UserService => repository;

export const userService = createUserService(firebaseUserRepository);
