import type { EventRepository } from '../../domain/repositories/EventRepository';
import type {
  CreateOrganizationEventInput,
  OrganizationEvent,
  UpdateOrganizationEventInput,
} from '../../domain/entities/event';
import { firebaseEventRepository } from '../../infrastructure/repositories/firebaseEventRepository';

export class EventUseCases {
  constructor(private readonly eventRepository: EventRepository) {}

  listByOrganization(organizationId: string): Promise<OrganizationEvent[]> {
    return this.eventRepository.listByOrganization(organizationId);
  }

  create(input: CreateOrganizationEventInput): Promise<OrganizationEvent> {
    return this.eventRepository.create(input);
  }

  update(id: string, input: UpdateOrganizationEventInput): Promise<OrganizationEvent> {
    return this.eventRepository.update(id, input);
  }

  delete(id: string): Promise<void> {
    return this.eventRepository.delete(id);
  }

  addEnvironment(eventId: string, environmentId: string): Promise<OrganizationEvent> {
    return this.eventRepository.addEnvironment(eventId, environmentId);
  }

  removeEnvironment(eventId: string, environmentId: string): Promise<OrganizationEvent> {
    return this.eventRepository.removeEnvironment(eventId, environmentId);
  }
}

export const eventService = new EventUseCases(firebaseEventRepository);
