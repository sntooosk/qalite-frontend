import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { environmentService } from '../../infrastructure/services/environmentService';
import { organizationService } from '../../infrastructure/services/organizationService';
import { storeService } from '../../infrastructure/services/storeService';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { PageLoader } from '../components/PageLoader';

interface ColdStartProviderProps {
  children: ReactNode;
}

const parseRouteContext = (pathname: string) => {
  const storeMatch = pathname.match(/^\/stores\/([^/]+)/);
  const environmentMatch = pathname.match(/^\/environments\/([^/]+)/);
  const isPublicEnvironment = pathname.endsWith('/public');

  return {
    storeId: storeMatch?.[1] ?? null,
    environmentId: environmentMatch?.[1] ?? null,
    isPublicEnvironment,
  };
};

export const ColdStartProvider = ({ children }: ColdStartProviderProps) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isInitializing } = useAuth();
  const { activeOrganization, setActiveOrganization } = useOrganizationBranding();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const organizationIdFromQuery = searchParams.get('Id');

  const routeContext = useMemo(
    () => parseRouteContext(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    if (isInitializing || activeOrganization) {
      return;
    }

    let isMounted = true;
    const shouldBootstrap = Boolean(
      organizationIdFromQuery ||
        routeContext.storeId ||
        (!routeContext.isPublicEnvironment && routeContext.environmentId) ||
        user?.organizationId,
    );

    if (!shouldBootstrap) {
      return;
    }

    const bootstrap = async () => {
      setIsBootstrapping(true);

      try {
        let resolvedOrganizationId: string | null = organizationIdFromQuery;

        if (!resolvedOrganizationId && routeContext.storeId) {
          const store = await storeService.getById(routeContext.storeId);
          resolvedOrganizationId = store?.organizationId ?? null;
        }

        if (
          !resolvedOrganizationId &&
          routeContext.environmentId &&
          !routeContext.isPublicEnvironment
        ) {
          const environment = await environmentService.getDetail(routeContext.environmentId, {
            forceRefresh: true,
          });
          const environmentStoreId = environment?.storeId ?? null;
          if (environmentStoreId) {
            const store = await storeService.getById(environmentStoreId);
            resolvedOrganizationId = store?.organizationId ?? null;
          }
        }

        if (!resolvedOrganizationId && user?.organizationId) {
          resolvedOrganizationId = user.organizationId;
        }

        if (!resolvedOrganizationId) {
          return;
        }

        const organization = await organizationService.getById(resolvedOrganizationId);
        if (isMounted) {
          setActiveOrganization(organization ?? null);
        }
      } catch (error) {
        console.error('Failed to bootstrap organization context', error);
        if (isMounted) {
          setActiveOrganization(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    activeOrganization,
    isInitializing,
    routeContext.environmentId,
    routeContext.isPublicEnvironment,
    routeContext.storeId,
    organizationIdFromQuery,
    setActiveOrganization,
    user?.organizationId,
  ]);

  if (isBootstrapping && !activeOrganization) {
    return <PageLoader message="Carregando sessão..." />;
  }

  return <>{children}</>;
};
