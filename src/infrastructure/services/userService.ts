import { UserUseCases } from '../../application/use-cases/UserUseCase';
import { firebaseUserRepository } from '../repositories/firebaseUserRepository';

export const userService = new UserUseCases(firebaseUserRepository);
