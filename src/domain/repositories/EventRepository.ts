import type {
  CreateOrganizationEventInput,
  OrganizationEvent,
  UpdateOrganizationEventInput,
} from '../entities/event';

export interface EventRepository {
  listByOrganization: (organizationId: string) => Promise<OrganizationEvent[]>;
  create: (input: CreateOrganizationEventInput) => Promise<OrganizationEvent>;
  update: (id: string, input: UpdateOrganizationEventInput) => Promise<OrganizationEvent>;
  delete: (id: string) => Promise<void>;
  addEnvironment: (eventId: string, environmentId: string) => Promise<OrganizationEvent>;
  removeEnvironment: (eventId: string, environmentId: string) => Promise<OrganizationEvent>;
}
