import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { UserAvatar } from '../components/UserAvatar';
import { StoreManagementPanel } from '../components/StoreManagementPanel';
import { ErrorState } from '../components/ErrorState';
import {
  OrganizationHeaderSkeleton,
  OrganizationMembersSkeleton,
} from '../components/skeletons/OrganizationDashboardSkeleton';

export const OrganizationDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const { t } = useTranslation();

  const fetchOrganization = useCallback(async () => {
    if (!user?.organizationId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await organizationService.getById(user.organizationId as string);

      if (!data) {
        const message = t('organizationPage.notFound');
        setError(message);
        showToast({ type: 'error', message });
        navigate('/no-organization', { replace: true });
        return;
      }

      setOrganization(data);
    } catch (error) {
      void error;
      const message = t('organizationPage.loadingError');
      setError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, showToast, t, user?.organizationId]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.organizationId) {
      navigate('/no-organization', { replace: true });
      return;
    }

    void fetchOrganization();
  }, [fetchOrganization, isInitializing, navigate, user]);

  useEffect(() => {
    setActiveOrganization(organization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [organization, setActiveOrganization]);

  return (
    <Layout>
      <section className="list-grid">
        <div className="card">
          <span className="badge">{t('organizationPage.badge')}</span>
          {isLoading ? (
            <OrganizationHeaderSkeleton />
          ) : error ? (
            <ErrorState
              title={t('organizationPage.loadingError')}
              description={error}
              actionLabel={t('retry')}
              onRetry={fetchOrganization}
            />
          ) : (
            <>
              <h1 className="section-title">{organization?.name ?? t('organizationPage.title')}</h1>
              <p className="section-subtitle">
                {organization?.description || t('organizationPage.subtitle')}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-primary">{t('organizationPage.members')}</h2>
            {!isLoading && !error && (
              <span className="badge">
                {organization?.members.length ?? 0} {t('organizationPage.member')}
                {(organization?.members.length ?? 0) === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {isLoading && <OrganizationMembersSkeleton />}

          {!isLoading && !error && (organization?.members.length ?? 0) === 0 && (
            <p className="section-subtitle">{t('organizationPage.empty')}</p>
          )}

          {!isLoading && !error && (organization?.members.length ?? 0) > 0 && (
            <ul className="member-list member-list--compact">
              {organization?.members.map((member) => (
                <li key={member.uid} className="member-list-item">
                  <UserAvatar name={member.displayName || member.email} />
                  <div className="member-list-details">
                    <span className="member-list-name">{member.displayName || member.email}</span>
                    <span className="member-list-email">{member.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {!isLoading && !error && organization && (
        <StoreManagementPanel
          organizationId={organization.id}
          organizationName={organization.name}
          canManageStores={isAdmin}
          canManageScenarios={Boolean(user)}
        />
      )}
    </Layout>
  );
};
