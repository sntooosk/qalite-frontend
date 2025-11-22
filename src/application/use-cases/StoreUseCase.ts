import type { StoreRepository } from '../../domain/repositories/StoreRepository';
import { firebaseStoreRepository } from '../../infrastructure/repositories/firebaseStoreRepository';

export type StoreService = StoreRepository;

export const createStoreService = (repository: StoreRepository): StoreService => repository;

export const storeService = createStoreService(firebaseStoreRepository);
