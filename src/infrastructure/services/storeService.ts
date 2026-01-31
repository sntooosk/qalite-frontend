import { StoreUseCases } from '../../application/use-cases/StoreUseCase';
import { firebaseStoreRepository } from '../repositories/firebaseStoreRepository';

export const storeService = new StoreUseCases(firebaseStoreRepository);
