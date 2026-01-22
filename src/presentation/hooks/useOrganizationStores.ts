import { useCallback, useEffect, useMemo } from 'react';

import type { Organization } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { useToast } from '../context/ToastContext';
import { useResource } from './useResource';

export const useOrganizationStores = (organizationId: string | null) => {
  const { showToast } = useToast();
  const fetchOrganizationStores = useCallback(async (id: string) => {
    const [organizationData, storesData] = await Promise.all([
      organizationService.getById(id),
      storeService.listByOrganization(id),
    ]);

    return {
      organization: organizationData,
      stores: storesData,
    };
  }, []);

  const { value, isLoading, isFetching, error, refetch, updatedAt, setValue, patchValue } =
    useResource<{ organization: Organization | null; stores: Store[] }>({
      resourceId: organizationId,
      getInitialValue: () => ({ organization: null, stores: [] }),
      fetch: fetchOrganizationStores,
    });

  useEffect(() => {
    if (!error) {
      return;
    }
    showToast({ type: 'error', message: error });
  }, [error, showToast]);

  const derivedState = useMemo(() => {
    const stores = value.stores ?? [];
    const isEmpty = !isLoading && !error && stores.length === 0;

    return {
      data: value,
      organization: value.organization,
      stores,
      isLoading,
      isFetching,
      error,
      isEmpty,
      refetch,
      updatedAt,
      setOrganizationStores: setValue,
      patchOrganizationStores: patchValue,
    };
  }, [value, isLoading, isFetching, error, refetch, updatedAt, setValue, patchValue]);

  return derivedState;
};
