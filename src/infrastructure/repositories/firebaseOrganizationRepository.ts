import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import {
  addUserToOrganization,
  createOrganization,
  deleteOrganization,
  getOrganizationDetail,
  getUserOrganization,
  listOrganizationSummaries,
  removeUserFromOrganization,
  updateOrganization,
} from '../external/organizations';

export const firebaseOrganizationRepository: OrganizationRepository = {
  listSummary: listOrganizationSummaries,
  getDetail: getOrganizationDetail,
  create: createOrganization,
  update: updateOrganization,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  getUserOrganizationByUserId: getUserOrganization,
};
