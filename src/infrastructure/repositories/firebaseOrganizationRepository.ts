import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import {
  addUserToOrganization,
  createOrganization,
  deleteOrganization,
  getOrganization,
  getUserOrganization,
  listOrganizations,
  removeUserFromOrganization,
  updateOrganization,
  uploadOrganizationLogo,
} from '../external/organizations';

export const firebaseOrganizationRepository: OrganizationRepository = {
  list: listOrganizations,
  getById: getOrganization,
  listSummary: listOrganizations,
  getDetail: getOrganization,
  create: createOrganization,
  update: updateOrganization,
  uploadLogo: uploadOrganizationLogo,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  getUserOrganizationByUserId: getUserOrganization,
};
