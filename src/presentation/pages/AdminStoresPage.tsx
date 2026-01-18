import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { browserstackService } from '../../application/use-cases/BrowserstackUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';
import { BarChartIcon, SparklesIcon, StorefrontIcon, UsersGroupIcon } from '../components/icons';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { useTranslation } from 'react-i18next';

interface StoreForm {
  name: string;
  site: string;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
};

export const AdminStoresPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isOrganizationLocked, setIsOrganizationLocked] = useState(false);
  const [storeForm, setStoreForm] = useState<StoreForm>(initialStoreForm);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeAutomationCounts, setStoreAutomationCounts] = useState<Record<string, number>>({});
  const [isLoadingAutomationStats, setIsLoadingAutomationStats] = useState(false);
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);
  const { t: translation } = useTranslation();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await organizationService.list();
        setOrganizations(data);
        const organizationFromParam = searchParams.get('organizationId');
        const hasValidOrganizationParam = Boolean(
          organizationFromParam && data.some((item) => item.id === organizationFromParam),
        );

        if (hasValidOrganizationParam && organizationFromParam) {
          setSelectedOrganizationId(organizationFromParam);
          setIsOrganizationLocked(true);
          return;
        }

        setIsOrganizationLocked(false);
        if (data.length > 0) {
          setSelectedOrganizationId(data[0].id);
        } else {
          setSelectedOrganizationId('');
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: translation('AdminStoresPage.toast-error-load-orgs') });
      }
    };

    void fetchOrganizations();
  }, [searchParams, showToast, translation]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setStores([]);
      setStoreAutomationCounts({});
      return;
    }

    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const data = await storeService.listByOrganization(selectedOrganizationId);
        setStores(data);
        setSearchParams({ organizationId: selectedOrganizationId });
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: translation('AdminStoresPage.toast-error-load-stores'),
        });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [selectedOrganizationId, setSearchParams, showToast, translation]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  useEffect(() => {
    setActiveOrganization(selectedOrganization ?? null);
  }, [selectedOrganization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  useEffect(() => {
    if (!selectedOrganizationId || stores.length === 0) {
      setStoreAutomationCounts({});
      return;
    }

    let isMounted = true;

    const fetchAutomationStats = async () => {
      setIsLoadingAutomationStats(true);
      try {
        const results = await Promise.all(
          stores.map(async (store) => {
            const scenarios = await storeService.listScenarios(store.id);
            const automatedCount = scenarios.filter((scenario) =>
              isAutomatedScenario(scenario.automation),
            ).length;

            return [store.id, automatedCount] as const;
          }),
        );

        if (isMounted) {
          setStoreAutomationCounts(Object.fromEntries(results));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({
            type: 'error',
            message: translation('AdminStoresPage.toast-error-load-automation-stats'),
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingAutomationStats(false);
        }
      }
    };

    void fetchAutomationStats();

    return () => {
      isMounted = false;
    };
  }, [selectedOrganizationId, stores, showToast, translation]);

  const selectedOrganizationCredentials = selectedOrganization?.browserstackCredentials ?? null;
  const hasBrowserstackCredentials = useMemo(
    () =>
      Boolean(
        selectedOrganizationCredentials?.username && selectedOrganizationCredentials?.accessKey,
      ),
    [selectedOrganizationCredentials?.accessKey, selectedOrganizationCredentials?.username],
  );

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!selectedOrganizationCredentials || !hasBrowserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(selectedOrganizationCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-load-browserstack');

      setBrowserstackBuilds([]);
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [hasBrowserstackCredentials, selectedOrganizationCredentials, showToast, translation]);

  useEffect(() => {
    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds]);

  const scenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: store.scenarioCount,
      })),
    [stores],
  );

  const automatedScenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: storeAutomationCounts[store.id] ?? 0,
      })),
    [stores, storeAutomationCounts],
  );

  const openCreateModal = () => {
    setStoreForm(initialStoreForm);
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const closeStoreModal = () => {
    setIsStoreModalOpen(false);
    setStoreForm(initialStoreForm);
    setStoreError(null);
  };

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();

    if (!selectedOrganizationId) {
      setStoreError(translation('AdminStoresPage.form-error-no-org-selected'));
      return;
    }

    if (!trimmedName) {
      setStoreError(translation('AdminStoresPage.form-error-no-store-name'));
      return;
    }

    if (!trimmedSite) {
      setStoreError(translation('AdminStoresPage.form-error-no-store-site'));
      return;
    }

    try {
      setIsSavingStore(true);

      const created = await storeService.create({
        organizationId: selectedOrganizationId,
        name: trimmedName,
        site: trimmedSite,
        stage: '',
      });

      setStores((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
      showToast({
        type: 'success',
        message: translation('AdminStoresPage.toast-success-store-created'),
      });
      closeStoreModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : translation('AdminStoresPage.toast-error-save-store');
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  return (
    <Layout>
      <section className="page-container" data-testid="stores-page">
        <div className="page-header">
          <div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/admin')}
              data-testid="stores-back-button"
            >
              &larr; {translation('back')}
            </button>
            <h1 className="section-title">
              {selectedOrganization
                ? translation('AdminStoresPage.stores-title-org-selected', {
                    organizationName: selectedOrganization.name,
                  })
                : translation('AdminStoresPage.stores-title-no-org-selected')}
            </h1>
            <p className="section-subtitle">
              {isOrganizationLocked
                ? translation('AdminStoresPage.stores-subtitle-locked')
                : translation('AdminStoresPage.stores-subtitle-unlocked')}
            </p>
          </div>
          <div className="page-actions">
            {selectedOrganization && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate(`/admin/organizations/${selectedOrganization.id}/manage`)
                }
                data-testid="manage-organization-button"
              >
                {translation('AdminStoresPage.manage-organization-button')}
              </Button>
            )}
            <Button
              type="button"
              onClick={openCreateModal}
              disabled={!selectedOrganizationId}
              data-testid="new-store-button"
            >
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">
            {translation('AdminStoresPage.loading-stores-message')}
          </p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">
              {translation('AdminStoresPage.no-stores-title')}
            </h2>
            <p className="section-subtitle">{translation('AdminStoresPage.no-stores-subtitle')}</p>
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              {translation('AdminStoresPage.new-store-button')}
            </Button>
          </div>
        ) : (
          <>
            {selectedOrganization && (
              <div className="page-section">
                <OrganizationLogPanel organizationId={selectedOrganization.id} />
              </div>
            )}

            <div className="dashboard-grid">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="card card-clickable"
                  data-testid={`store-card-${store.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/stores/${store.id}`)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => navigate(`/stores/${store.id}`))
                  }
                >
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-title-icon" aria-hidden>
                        <StorefrontIcon className="icon icon--lg" />
                      </span>
                      <div>
                        <h2 className="card-title">{store.name}</h2>
                      </div>
                    </div>
                    <span className="badge">
                      {translation('AdminStoresPage.store-card-scenarios-badge', {
                        scenarioCount: store.scenarioCount,
                      })}
                    </span>
                  </div>
                  <div className="card-link-hint">
                    <span>{translation('storesPage.openStore')}</span>
                    <span aria-hidden>&rarr;</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="organization-extra">
              {selectedOrganization && (
                <section className="organization-collaborators-card">
                  <div className="organization-collaborators-card__header">
                    <div className="section-heading">
                      <span className="section-heading__icon" aria-hidden>
                        <UsersGroupIcon className="icon icon--lg" />
                      </span>
                      <div>
                        <h3>{translation('AdminStoresPage.collaborators-card-title')}</h3>
                        <p className="section-subtitle">
                          {translation('AdminStoresPage.collaborators-card-subtitle')}
                        </p>
                      </div>
                    </div>
                    <span className="badge">
                      {selectedOrganization.members.length === 1
                        ? translation('AdminStoresPage.collaborators-count-singular')
                        : translation('AdminStoresPage.collaborators-count-plural', {
                            count: selectedOrganization.members.length,
                          })}
                    </span>
                  </div>
                  {selectedOrganization.members.length === 0 ? (
                    <p className="section-subtitle">
                      {translation('AdminStoresPage.no-collaborators-message')}
                    </p>
                  ) : (
                    <ul className="collaborator-list">
                      {selectedOrganization.members.map((member) => (
                        <li key={member.uid} className="collaborator-card">
                          <UserAvatar name={member.displayName || member.email} size="sm" />
                          <div className="collaborator-card__details">
                            <strong>{member.displayName || member.email}</strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <section className="organization-charts-grid">
                <SimpleBarChart
                  title={translation('AdminStoresPage.chart-scenarios-title')}
                  description={translation('AdminStoresPage.scenarios-per-store-chart-description')}
                  data={scenariosPerStoreData}
                  emptyMessage={translation(
                    'AdminStoresPage.scenarios-per-store-chart-empty-message',
                  )}
                  icon={<BarChartIcon aria-hidden className="icon icon--lg" />}
                />
                <SimpleBarChart
                  title={translation('AdminStoresPage.chart-automated-title')}
                  description={translation('AdminStoresPage.automated-scenarios-chart-description')}
                  data={automatedScenariosPerStoreData}
                  emptyMessage={translation(
                    'AdminStoresPage.automated-scenarios-chart-empty-message',
                  )}
                  isLoading={isLoadingAutomationStats}
                  variant="info"
                  icon={<SparklesIcon aria-hidden className="icon icon--lg" />}
                />
              </section>

              {hasBrowserstackCredentials ? (
                <BrowserstackKanban
                  builds={browserstackBuilds}
                  isLoading={isLoadingBrowserstack}
                  onRefresh={loadBrowserstackBuilds}
                />
              ) : (
                <div className="card">
                  <span className="badge">
                    {translation('AdminStoresPage.browserstack-card-badge')}
                  </span>
                  <h2 className="section-title">
                    {translation('AdminStoresPage.browserstack-card-title')}
                  </h2>
                  <p className="section-subtitle">
                    {translation('AdminStoresPage.browserstack-card-subtitle')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <Modal
        isOpen={isStoreModalOpen}
        onClose={closeStoreModal}
        title={translation('AdminStoresPage.store-name-label')}
        description={translation('AdminStoresPage.modal-store-description')}
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit} data-testid="store-form">
          <TextInput
            id="store-name"
            label={translation('AdminStoresPage.store-name-label')}
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder={translation('AdminStoresPage.store-name-placeholder')}
            required
            dataTestId="store-name-input"
          />
          <TextInput
            id="store-site"
            label={translation('AdminStoresPage.store-site-label')}
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            placeholder={translation('AdminStoresPage.store-site-placeholder')}
            dataTestId="store-site-input"
          />
          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isSavingStore}
              loadingText={translation('AdminStoresPage.save-button-saving')}
              data-testid="save-store-button"
            >
              {translation('AdminStoresPage.save-store-button')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
              data-testid="cancel-store-button"
            >
              {translation('AdminStoresPage.cancel-store-button')}
            </Button>
          </div>
        </form>
      </Modal>

    </Layout>
  );
};
