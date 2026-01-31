import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationListCursor,
  OrganizationMember,
  OrganizationSummary,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../entities/organization';
import type { PaginatedResult, PaginationParams } from '../pagination';

export interface OrganizationRepository {
  listSummary: (
    pagination: PaginationParams<OrganizationListCursor>,
  ) => Promise<PaginatedResult<OrganizationSummary, OrganizationListCursor>>;
  getDetail: (id: string) => Promise<Organization | null>;
  create: (organization: CreateOrganizationPayload) => Promise<Organization>;
  update: (id: string, organization: UpdateOrganizationPayload) => Promise<Organization>;
  delete: (id: string) => Promise<void>;
  addUser: (payload: AddUserToOrganizationPayload) => Promise<OrganizationMember>;
  removeUser: (payload: RemoveUserFromOrganizationPayload) => Promise<void>;
  getUserOrganizationByUserId: (userId: string) => Promise<Organization | null>;
}
