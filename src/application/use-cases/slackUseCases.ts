import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import type { SlackTaskSummaryDTO } from '../dto/slack';

export class SlackUseCases {
  constructor(private readonly slackRepository: SlackRepository) {}

  sendTaskSummary(payload: SlackTaskSummaryDTO): Promise<void> {
    return this.slackRepository.sendTaskSummary(payload);
  }
}
