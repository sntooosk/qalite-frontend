import type { EnvironmentRepository } from '../../domain/repositories/EnvironmentRepository';
import type {
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  Environment,
  EnvironmentBug,
  EnvironmentRealtimeFilters,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentBugInput,
  UpdateEnvironmentInput,
} from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';
import { firebaseEnvironmentRepository } from '../../infrastructure/repositories/firebaseEnvironmentRepository';

export class EnvironmentUseCases {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  create(input: CreateEnvironmentInput): Promise<Environment> {
    return this.environmentRepository.create(input);
  }

  update(id: string, input: UpdateEnvironmentInput): Promise<void> {
    return this.environmentRepository.update(id, input);
  }

  delete(id: string): Promise<void> {
    return this.environmentRepository.delete(id);
  }

  observeEnvironment(id: string, onChange: (environment: Environment | null) => void): () => void {
    return this.environmentRepository.observeEnvironment(id, onChange);
  }

  observeAll(
    filters: EnvironmentRealtimeFilters,
    onChange: (environments: Environment[]) => void,
  ): () => void {
    return this.environmentRepository.observeAll(filters, onChange);
  }

  addUser(id: string, userId: string): Promise<void> {
    return this.environmentRepository.addUser(id, userId);
  }

  removeUser(id: string, userId: string): Promise<void> {
    return this.environmentRepository.removeUser(id, userId);
  }

  updateScenarioStatus(
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
    platform?: EnvironmentScenarioPlatform,
  ): Promise<void> {
    return this.environmentRepository.updateScenarioStatus(
      environmentId,
      scenarioId,
      status,
      platform,
    );
  }

  uploadScenarioEvidence(
    environmentId: string,
    scenarioId: string,
    evidenceLink: string,
  ): Promise<string> {
    return this.environmentRepository.uploadScenarioEvidence(
      environmentId,
      scenarioId,
      evidenceLink,
    );
  }

  listBugs(environmentId: string): Promise<EnvironmentBug[]> {
    return this.environmentRepository.listBugs(environmentId);
  }

  createBug(environmentId: string, bug: CreateEnvironmentBugInput): Promise<EnvironmentBug> {
    return this.environmentRepository.createBug(environmentId, bug);
  }

  updateBug(environmentId: string, bugId: string, input: UpdateEnvironmentBugInput): Promise<void> {
    return this.environmentRepository.updateBug(environmentId, bugId, input);
  }

  deleteBug(environmentId: string, bugId: string): Promise<void> {
    return this.environmentRepository.deleteBug(environmentId, bugId);
  }

  transitionStatus(params: TransitionEnvironmentStatusParams): Promise<void> {
    return this.environmentRepository.transitionStatus(params);
  }

  exportAsPDF(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
    storeName?: string,
  ): void {
    return this.environmentRepository.exportAsPDF(
      environment,
      bugs,
      participantProfiles,
      storeName,
    );
  }

  copyAsMarkdown(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
    storeName?: string,
  ): Promise<void> {
    return this.environmentRepository.copyAsMarkdown(
      environment,
      bugs,
      participantProfiles,
      storeName,
    );
  }
}

export const environmentService = new EnvironmentUseCases(firebaseEnvironmentRepository);
