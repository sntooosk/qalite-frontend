import { OrganizationUseCases } from '../../application/use-cases/OrganizationUseCase';
import { firebaseOrganizationRepository } from '../repositories/firebaseOrganizationRepository';

export const organizationService = new OrganizationUseCases(firebaseOrganizationRepository);
