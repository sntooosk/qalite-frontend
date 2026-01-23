import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useOrganizationStores } from '../hooks/useOrganizationStores';
import { UserAvatar } from '../components/UserAvatar';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';
import { StoreScenarioComparisonChart } from '../components/StoreScenarioComparisonChart';
import { InboxIcon, StorefrontIcon, UsersGroupIcon } from '../components/icons';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { browserstackService } from '../../infrastructure/services/browserstackService';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import { useTranslation } from 'react-i18next';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isInitializing } = useAuth();
  const organizationId = user?.organizationId ?? null;
  const { organization, stores, isLoading, status } = useOrganizationStores(organizationId);
  const { setActiveOrganization } = useOrganizationBranding();
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);

  const { t } = useTranslation();
  const scenarioChartData = useMemo(() => {
    return stores
      .map((store) => {
        const automated = store.automatedScenarioCount ?? 0;
        const notAutomated =
          store.notAutomatedScenarioCount ?? Math.max(store.scenarioCount - automated, 0);
        const total = store.scenarioCount || automated + notAutomated;

        return {
          label: store.name,
          automated,
          notAutomated,
          total,
        };
      })
      .sort(
        (first, second) => second.total - first.total || first.label.localeCompare(second.label),
      );
  }, [stores]);
  const hasScenarioChartData = scenarioChartData.some((item) => item.total > 0);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (!user.organizationId) {
      navigate('/no-organization', { replace: true });
      return;
    }
  }, [isInitializing, navigate, user]);

  useEffect(() => {
    setActiveOrganization(organization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [organization, setActiveOrganization]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  const subtitle = useMemo(() => {
    if (organization?.name) {
      return (t('userPage.organizationName', { org: organization.name }), t('selectStore'));
    }

    if (status === 'error') {
      return t('userPage.loadingError');
    }

    return t('userPage.chooseStore');
  }, [organization?.name, status, t]);

  const isError = status === 'error';
  const emptyStateTitle = isError ? t('userPage.loadingStores') : t('userPage.unavailableStores');
  const emptyStateDescription = isError ? t('userPage.updatePage') : t('userPage.addStores');

  const organizationCredentials = organization?.browserstackCredentials ?? null;
  const hasBrowserstackCredentials = useMemo(
    () => Boolean(organizationCredentials?.username && organizationCredentials?.accessKey),
    [organizationCredentials?.accessKey, organizationCredentials?.username],
  );

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!hasBrowserstackCredentials || !organizationCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(organizationCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('userPage.errorBrowserstack');
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [hasBrowserstackCredentials, organizationCredentials, showToast, t]);

  useEffect(() => {
    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds]);

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">{t('userPage.badge')}</span>
            <h1 className="section-title">{t('userPage.storeTitle')}</h1>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">{t('userPage.loadingTitle')}</p>
        ) : stores.length === 0 ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            icon={<InboxIcon className="icon icon--lg" aria-hidden />}
            action={
              isError ? (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  {t('userPage.reload')}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
                  {t('userPage.profile')}
                </Button>
              )
            }
          />
        ) : (
          <div className="dashboard-grid">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className="card card-interactive"
                onClick={() => handleSelectStore(store.id)}
              >
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="card-title-icon" aria-hidden>
                      <StorefrontIcon className="icon icon--lg" />
                    </span>
                    <div>
                      <h2 className="card-title">{store.name}</h2>
                      <span className="badge store-card-scenarios">
                        {t('AdminStoresPage.store-card-scenarios-badge', {
                          scenarioCount: store.scenarioCount,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-link-hint">
                  <span>{t('storesPage.openStore')}</span>
                  <span aria-hidden="true">&rarr;</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {stores.length > 0 && (
          <div className="organization-extra">
            {organization && (
              <section className="organization-collaborators-card">
                <div className="organization-collaborators-card__header">
                  <div className="section-heading">
                    <span className="section-heading__icon" aria-hidden>
                      <UsersGroupIcon className="icon icon--lg" />
                    </span>
                    <div>
                      <h3>{t('userPage.users')}</h3>
                      <p className="section-subtitle">{t('userPage.userSubtitle')}</p>
                    </div>
                  </div>
                  <span className="badge">
                    {organization.members.length} {t('userPage.usersCount')}
                    {organization.members.length === 1
                      ? t('userPage.oneUser')
                      : t('userPage.moreUsers')}
                  </span>
                </div>
                {organization.members.length === 0 ? (
                  <p className="section-subtitle">{t('userPage.members')}</p>
                ) : (
                  <ul className="collaborator-list">
                    {organization.members.map((member) => (
                      <li key={member.uid} className="collaborator-card">
                        <UserAvatar
                          name={member.displayName || member.email}
                          size="sm"
                          photoUrl={member.photoURL ?? null}
                        />
                        <div className="collaborator-card__details">
                          <strong>{member.displayName || member.email}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}

        {stores.length > 0 && (
          <div className="organization-charts-grid organization-charts-grid--dashboard">
            <StoreScenarioComparisonChart
              title={t('AdminStoresPage.chart-automation-comparison-title')}
              description={t('AdminStoresPage.chart-automation-comparison-description')}
              data={hasScenarioChartData ? scenarioChartData : []}
              emptyMessage={t('AdminStoresPage.chart-automation-comparison-empty-message')}
              isLoading={isLoading}
            />
          </div>
        )}
      </section>

      {organization && hasBrowserstackCredentials && (
        <section className="page-container">
          <BrowserstackKanban
            builds={browserstackBuilds}
            isLoading={isLoadingBrowserstack}
            onRefresh={loadBrowserstackBuilds}
          />
        </section>
      )}
    </Layout>
  );
};
