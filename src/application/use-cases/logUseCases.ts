import type { LogRepository } from '../../domain/repositories/LogRepository';
import type { ActivityLogDTO, ActivityLogInputDTO } from '../dto/activityLog';

export class LogUseCases {
  constructor(private readonly logRepository: LogRepository) {}

  record(input: ActivityLogInputDTO): Promise<void> {
    return this.logRepository.record(input);
  }

  listByOrganization(organizationId: string): Promise<ActivityLogDTO[]> {
    return this.logRepository.listByOrganization(organizationId);
  }
}
