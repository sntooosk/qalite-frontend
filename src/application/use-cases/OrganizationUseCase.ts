import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import { firebaseOrganizationRepository } from '../../infrastructure/repositories/firebaseOrganizationRepository';

export type OrganizationService = OrganizationRepository;

export const createOrganizationService = (
  repository: OrganizationRepository,
): OrganizationService => repository;

export const organizationService = createOrganizationService(firebaseOrganizationRepository);
