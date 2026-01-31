import type { CacheStore } from '../cache/CacheStore';
import type { EnvironmentRepository } from '../../domain/repositories/EnvironmentRepository';
import type {
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  Environment,
  EnvironmentBug,
  EnvironmentListParams,
  EnvironmentRealtimeFilters,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  EnvironmentSummaryPage,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentBugInput,
  UpdateEnvironmentInput,
} from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';

export class EnvironmentUseCases {
  private readonly cacheStore?: CacheStore;
  private readonly summaryCacheOptions = {
    entity: 'environment-summary',
    ttlMs: 60_000,
    schemaVersion: 1,
  };
  private readonly detailCacheOptions = {
    entity: 'environment-detail',
    ttlMs: 60_000,
    schemaVersion: 1,
  };

  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    cacheStore?: CacheStore,
  ) {
    this.cacheStore = cacheStore;
  }

  create(input: CreateEnvironmentInput): Promise<Environment> {
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.create(input);
  }

  update(id: string, input: UpdateEnvironmentInput): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(id));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.update(id, input);
  }

  delete(id: string): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(id));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
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
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(id));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.addUser(id, userId);
  }

  removeUser(id: string, userId: string): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(id));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.removeUser(id, userId);
  }

  updateScenarioStatus(
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
    platform?: EnvironmentScenarioPlatform,
  ): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(environmentId));
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
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(environmentId));
    return this.environmentRepository.uploadScenarioEvidence(
      environmentId,
      scenarioId,
      evidenceLink,
    );
  }

  listBugs(environmentId: string): Promise<EnvironmentBug[]> {
    return this.environmentRepository.listBugs(environmentId);
  }

  async listSummary(
    params: EnvironmentListParams,
    options?: { onUpdate?: (page: EnvironmentSummaryPage) => void; forceRefresh?: boolean },
  ): Promise<EnvironmentSummaryPage> {
    const cacheKey = this.summaryCacheKey(params);
    const cached = this.cacheStore?.get<EnvironmentSummaryPage>(cacheKey, this.summaryCacheOptions);

    if (cached && !options?.forceRefresh) {
      if (options?.onUpdate || cached.isStale) {
        void this.revalidateSummary(params, cacheKey, options?.onUpdate);
      }
      return cached.value;
    }

    const fresh = await this.environmentRepository.listSummary(params);
    this.cacheStore?.set(cacheKey, fresh, this.summaryCacheOptions);
    return fresh;
  }

  async getDetail(
    environmentId: string,
    options?: { onUpdate?: (environment: Environment | null) => void; forceRefresh?: boolean },
  ): Promise<Environment | null> {
    const cacheKey = this.detailCacheKey(environmentId);
    const cached = this.cacheStore?.get<Environment | null>(cacheKey, this.detailCacheOptions);

    if (cached && !options?.forceRefresh) {
      if (options?.onUpdate || cached.isStale) {
        void this.revalidateDetail(environmentId, cacheKey, options?.onUpdate);
      }
      return cached.value;
    }

    const fresh = await this.environmentRepository.getDetail(environmentId);
    this.cacheStore?.set(cacheKey, fresh, this.detailCacheOptions);
    return fresh;
  }

  createBug(environmentId: string, bug: CreateEnvironmentBugInput): Promise<EnvironmentBug> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(environmentId));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.createBug(environmentId, bug);
  }

  updateBug(environmentId: string, bugId: string, input: UpdateEnvironmentBugInput): Promise<void> {
    return this.environmentRepository.updateBug(environmentId, bugId, input);
  }

  deleteBug(environmentId: string, bugId: string): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(environmentId));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
    return this.environmentRepository.deleteBug(environmentId, bugId);
  }

  transitionStatus(params: TransitionEnvironmentStatusParams): Promise<void> {
    this.cacheStore?.invalidatePrefix(this.detailCacheKey(params.environment.id));
    this.cacheStore?.invalidatePrefix(this.summaryCacheKeyPrefix());
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

  private summaryCacheKey(params: EnvironmentListParams): string {
    const cursorKey = params.cursor
      ? `${params.cursor.id}:${params.cursor.createdAt ?? 'none'}`
      : 'start';
    return `${this.summaryCacheKeyPrefix()}:${params.storeId}:${params.limit}:${cursorKey}`;
  }

  private summaryCacheKeyPrefix(): string {
    return this.summaryCacheOptions.entity;
  }

  private detailCacheKey(environmentId: string): string {
    return `${this.detailCacheOptions.entity}:${environmentId}`;
  }

  private async revalidateSummary(
    params: EnvironmentListParams,
    cacheKey: string,
    onUpdate?: (page: EnvironmentSummaryPage) => void,
  ): Promise<void> {
    try {
      const fresh = await this.environmentRepository.listSummary(params);
      this.cacheStore?.set(cacheKey, fresh, this.summaryCacheOptions);
      onUpdate?.(fresh);
    } catch (error) {
      console.error('Failed to refresh environment summaries', error);
    }
  }

  private async revalidateDetail(
    environmentId: string,
    cacheKey: string,
    onUpdate?: (environment: Environment | null) => void,
  ): Promise<void> {
    try {
      const fresh = await this.environmentRepository.getDetail(environmentId);
      this.cacheStore?.set(cacheKey, fresh, this.detailCacheOptions);
      onUpdate?.(fresh);
    } catch (error) {
      console.error('Failed to refresh environment detail', error);
    }
  }
}
