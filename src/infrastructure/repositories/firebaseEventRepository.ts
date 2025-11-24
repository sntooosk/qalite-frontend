import type { EventRepository } from '../../domain/repositories/EventRepository';
import {
  addEnvironmentToEvent,
  createOrganizationEvent,
  deleteOrganizationEvent,
  listOrganizationEvents,
  removeEnvironmentFromEvent,
  updateOrganizationEvent,
} from '../external/events';

export const firebaseEventRepository: EventRepository = {
  listByOrganization: listOrganizationEvents,
  create: createOrganizationEvent,
  update: updateOrganizationEvent,
  delete: deleteOrganizationEvent,
  addEnvironment: addEnvironmentToEvent,
  removeEnvironment: removeEnvironmentFromEvent,
};
