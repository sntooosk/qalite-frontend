import type { CacheStore } from '../cache/CacheStore';
import { cacheFirstWithRevalidate } from '../cache/cacheStrategy';
import type { StoreRepository } from '../../domain/repositories/StoreRepository';
import type {
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreCategoryCursor,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreScenarioCursor,
  StoreSummary,
  StoreSuite,
  StoreSuiteInput,
  StoreSuiteCursor,
  StoreListCursor,
  UpdateStorePayload,
} from '../../domain/entities/store';
import type { PaginatedResult, PaginationParams } from '../../domain/pagination';
import { localCacheStore } from '../../infrastructure/cache/LocalCacheStore';
import { firebaseStoreRepository } from '../../infrastructure/repositories/firebaseStoreRepository';

const DEFAULT_PAGE_SIZE = 50;
const SUMMARY_CACHE_TTL_MS = 2 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

const buildSummaryCacheKey = (
  organizationId: string,
  pagination: PaginationParams<StoreListCursor>,
) => `stores:summary:${organizationId}:${pagination.limit}:${pagination.cursor?.id ?? 'start'}`;

const buildDetailCacheKey = (storeId: string) => `stores:detail:${storeId}`;

export class StoreUseCases {
  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly cacheStore: CacheStore,
  ) {}

  async listSummary(
    organizationId: string,
    pagination: PaginationParams<StoreListCursor> = { limit: DEFAULT_PAGE_SIZE },
    onRevalidate?: (value: PaginatedResult<StoreSummary, StoreListCursor>) => void,
  ): Promise<PaginatedResult<StoreSummary, StoreListCursor>> {
    return cacheFirstWithRevalidate({
      cacheStore: this.cacheStore,
      cacheKey: buildSummaryCacheKey(organizationId, pagination),
      ttlMs: SUMMARY_CACHE_TTL_MS,
      fetcher: () => this.storeRepository.listSummary(organizationId, pagination),
      onRevalidate,
    });
  }

  async listSummaryAll(
    organizationId: string,
    onRevalidate?: (value: StoreSummary[]) => void,
  ): Promise<StoreSummary[]> {
    const all: StoreSummary[] = [];
    let cursor: StoreListCursor | null = null;

    do {
      const page = await this.listSummary(organizationId, { limit: DEFAULT_PAGE_SIZE, cursor });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    onRevalidate?.(all);

    return all;
  }

  async getDetail(id: string, onRevalidate?: (value: Store | null) => void): Promise<Store | null> {
    return cacheFirstWithRevalidate({
      cacheStore: this.cacheStore,
      cacheKey: buildDetailCacheKey(id),
      ttlMs: DETAIL_CACHE_TTL_MS,
      fetcher: () => this.storeRepository.getDetail(id),
      onRevalidate,
    });
  }

  async create(store: CreateStorePayload): Promise<Store> {
    const created = await this.storeRepository.create(store);
    this.cacheStore.clearByPrefix('stores:summary:');
    return created;
  }

  async update(id: string, store: UpdateStorePayload): Promise<Store> {
    const updated = await this.storeRepository.update(id, store);
    this.cacheStore.clearByPrefix('stores:summary:');
    this.cacheStore.remove(buildDetailCacheKey(id));
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.storeRepository.delete(id);
    this.cacheStore.clearByPrefix('stores:summary:');
    this.cacheStore.remove(buildDetailCacheKey(id));
  }

  listScenarios(
    storeId: string,
    pagination: PaginationParams<StoreScenarioCursor>,
  ): Promise<PaginatedResult<StoreScenario, StoreScenarioCursor>> {
    return this.storeRepository.listScenarios(storeId, pagination);
  }

  async listScenariosAll(storeId: string): Promise<StoreScenario[]> {
    const all: StoreScenario[] = [];
    let cursor: StoreScenarioCursor | null = null;

    do {
      const page = await this.listScenarios(storeId, { limit: DEFAULT_PAGE_SIZE, cursor });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return all;
  }

  async createScenario(scenario: { storeId: string } & StoreScenarioInput): Promise<StoreScenario> {
    const created = await this.storeRepository.createScenario(scenario);
    this.cacheStore.clearByPrefix('stores:summary:');
    this.cacheStore.remove(buildDetailCacheKey(scenario.storeId));
    return created;
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ): Promise<StoreScenario> {
    return this.storeRepository.updateScenario(storeId, scenarioId, scenario);
  }

  async deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    await this.storeRepository.deleteScenario(storeId, scenarioId);
    this.cacheStore.clearByPrefix('stores:summary:');
    this.cacheStore.remove(buildDetailCacheKey(storeId));
  }

  listSuites(
    storeId: string,
    pagination: PaginationParams<StoreSuiteCursor>,
  ): Promise<PaginatedResult<StoreSuite, StoreSuiteCursor>> {
    return this.storeRepository.listSuites(storeId, pagination);
  }

  async listSuitesAll(storeId: string): Promise<StoreSuite[]> {
    const all: StoreSuite[] = [];
    let cursor: StoreSuiteCursor | null = null;

    do {
      const page = await this.listSuites(storeId, { limit: DEFAULT_PAGE_SIZE, cursor });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return all;
  }

  createSuite(suite: { storeId: string } & StoreSuiteInput): Promise<StoreSuite> {
    return this.storeRepository.createSuite(suite);
  }

  updateSuite(storeId: string, suiteId: string, suite: StoreSuiteInput): Promise<StoreSuite> {
    return this.storeRepository.updateSuite(storeId, suiteId, suite);
  }

  deleteSuite(storeId: string, suiteId: string): Promise<void> {
    return this.storeRepository.deleteSuite(storeId, suiteId);
  }

  listCategories(
    storeId: string,
    pagination: PaginationParams<StoreCategoryCursor>,
  ): Promise<PaginatedResult<StoreCategory, StoreCategoryCursor>> {
    return this.storeRepository.listCategories(storeId, pagination);
  }

  async listCategoriesAll(storeId: string): Promise<StoreCategory[]> {
    const all: StoreCategory[] = [];
    let cursor: StoreCategoryCursor | null = null;

    do {
      const page = await this.listCategories(storeId, { limit: DEFAULT_PAGE_SIZE, cursor });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    return all;
  }

  createCategory(category: { storeId: string } & StoreCategoryInput): Promise<StoreCategory> {
    return this.storeRepository.createCategory(category);
  }

  updateCategory(
    storeId: string,
    categoryId: string,
    category: StoreCategoryInput,
  ): Promise<StoreCategory> {
    return this.storeRepository.updateCategory(storeId, categoryId, category);
  }

  deleteCategory(storeId: string, categoryId: string): Promise<void> {
    return this.storeRepository.deleteCategory(storeId, categoryId);
  }

  exportStore(storeId: string): Promise<StoreExportPayload> {
    return this.storeRepository.exportStore(storeId);
  }
}

export const storeService = new StoreUseCases(firebaseStoreRepository, localCacheStore);
