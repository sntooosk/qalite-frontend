import type { LogRepository } from '../../domain/repositories/LogRepository';
import { firebaseLogRepository } from '../../infrastructure/repositories/firebaseLogRepository';

export type LogService = LogRepository;

export const createLogService = (repository: LogRepository): LogService => repository;

export const logService = createLogService(firebaseLogRepository);
