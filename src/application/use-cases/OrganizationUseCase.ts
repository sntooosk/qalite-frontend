import type { CacheStore } from '../cache/CacheStore';
import { cacheFirstWithRevalidate } from '../cache/cacheStrategy';
import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationListCursor,
  OrganizationMember,
  OrganizationSummary,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../../domain/entities/organization';
import type { PaginatedResult, PaginationParams } from '../../domain/pagination';
import { localCacheStore } from '../../infrastructure/cache/LocalCacheStore';
import { firebaseOrganizationRepository } from '../../infrastructure/repositories/firebaseOrganizationRepository';

const DEFAULT_PAGE_SIZE = 50;
const SUMMARY_CACHE_TTL_MS = 2 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

const buildSummaryCacheKey = (pagination: PaginationParams<OrganizationListCursor>) =>
  `organizations:summary:${pagination.limit}:${pagination.cursor?.id ?? 'start'}`;

const buildDetailCacheKey = (organizationId: string) => `organizations:detail:${organizationId}`;

export class OrganizationUseCases {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly cacheStore: CacheStore,
  ) {}

  async listSummary(
    pagination: PaginationParams<OrganizationListCursor> = { limit: DEFAULT_PAGE_SIZE },
    onRevalidate?: (value: PaginatedResult<OrganizationSummary, OrganizationListCursor>) => void,
  ): Promise<PaginatedResult<OrganizationSummary, OrganizationListCursor>> {
    return cacheFirstWithRevalidate({
      cacheStore: this.cacheStore,
      cacheKey: buildSummaryCacheKey(pagination),
      ttlMs: SUMMARY_CACHE_TTL_MS,
      fetcher: () => this.organizationRepository.listSummary(pagination),
      onRevalidate,
    });
  }

  async listSummaryAll(
    onRevalidate?: (value: OrganizationSummary[]) => void,
  ): Promise<OrganizationSummary[]> {
    const all: OrganizationSummary[] = [];
    let cursor: OrganizationListCursor | null = null;

    do {
      const page = await this.listSummary({ limit: DEFAULT_PAGE_SIZE, cursor });
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);

    onRevalidate?.(all);
    return all;
  }

  async getDetail(
    id: string,
    onRevalidate?: (value: Organization | null) => void,
  ): Promise<Organization | null> {
    return cacheFirstWithRevalidate({
      cacheStore: this.cacheStore,
      cacheKey: buildDetailCacheKey(id),
      ttlMs: DETAIL_CACHE_TTL_MS,
      fetcher: () => this.organizationRepository.getDetail(id),
      onRevalidate,
    });
  }

  async create(organization: CreateOrganizationPayload): Promise<Organization> {
    const created = await this.organizationRepository.create(organization);
    this.cacheStore.clearByPrefix('organizations:summary:');
    return created;
  }

  async update(id: string, organization: UpdateOrganizationPayload): Promise<Organization> {
    const updated = await this.organizationRepository.update(id, organization);
    this.cacheStore.clearByPrefix('organizations:summary:');
    this.cacheStore.remove(buildDetailCacheKey(id));
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.organizationRepository.delete(id);
    this.cacheStore.clearByPrefix('organizations:summary:');
    this.cacheStore.remove(buildDetailCacheKey(id));
  }

  async addUser(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    const member = await this.organizationRepository.addUser(payload);
    this.cacheStore.clearByPrefix('organizations:detail:');
    this.cacheStore.clearByPrefix('organizations:summary:');
    return member;
  }

  async removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    await this.organizationRepository.removeUser(payload);
    this.cacheStore.clearByPrefix('organizations:detail:');
    this.cacheStore.clearByPrefix('organizations:summary:');
  }

  getUserOrganizationByUserId(userId: string): Promise<Organization | null> {
    return this.organizationRepository.getUserOrganizationByUserId(userId);
  }
}

export const organizationService = new OrganizationUseCases(
  firebaseOrganizationRepository,
  localCacheStore,
);
