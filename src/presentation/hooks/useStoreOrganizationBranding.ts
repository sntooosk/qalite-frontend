import { useCallback } from 'react';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useResource } from './useResource';

export const useStoreOrganizationBranding = (storeId: string | null | undefined) => {
  const fetchOrganization = useCallback(async (id: string) => {
    const store = await storeService.getById(id);

    if (!store?.organizationId) {
      return null;
    }

    return organizationService.getById(store.organizationId);
  }, []);

  const {
    value: organization,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setValue,
    patchValue,
  } = useResource<Organization | null>({
    resourceId: storeId,
    getInitialValue: () => null,
    fetch: fetchOrganization,
  });

  return {
    data: organization,
    organization,
    isLoading,
    isFetching,
    error,
    refetch,
    updatedAt,
    setOrganization: setValue,
    patchOrganization: patchValue,
  };
};
