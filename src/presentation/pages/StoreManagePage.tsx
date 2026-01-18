import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Store } from '../../domain/entities/store';
import type { Organization } from '../../domain/entities/organization';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { PageLoader } from '../components/PageLoader';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';

export const StoreManagePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const { t } = useTranslation();

  const [store, setStore] = useState<Store | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  const [storeSettings, setStoreSettings] = useState({ name: '', site: '' });
  const [storeSettingsError, setStoreSettingsError] = useState<string | null>(null);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!storeId) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    if (user.role !== 'admin') {
      showToast({ type: 'error', message: t('storeSummary.storeAccessDenied') });
      navigate('/dashboard', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoadingStore(true);
        const data = await storeService.getById(storeId);

        if (!data) {
          showToast({ type: 'error', message: t('storeSummary.storeNotFound') });
          navigate('/dashboard', { replace: true });
          return;
        }

        setStore(data);
        setStoreSettings({ name: data.name, site: data.site });

        const organizationData = await organizationService.getById(data.organizationId);
        if (organizationData) {
          setOrganization(organizationData);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: t('storeSummary.storeLoadError') });
      } finally {
        setIsLoadingStore(false);
      }
    };

    void fetchData();
  }, [isInitializing, navigate, showToast, storeId, t, user]);

  useEffect(() => {
    setActiveOrganization(organization);
  }, [organization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  const handleStoreSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!store) {
      return;
    }

    const trimmedName = storeSettings.name.trim();
    const trimmedSite = storeSettings.site.trim();

    if (!trimmedName) {
      setStoreSettingsError(t('storeSummary.storeNameRequired'));
      return;
    }

    if (!trimmedSite) {
      setStoreSettingsError(t('storeSummary.storeSiteRequired'));
      return;
    }

    try {
      setIsUpdatingStore(true);
      const updated = await storeService.update(store.id, {
        name: trimmedName,
        site: trimmedSite,
        stage: store.stage,
      });

      setStore(updated);
      setStoreSettings({ name: updated.name, site: updated.site });
      setStoreSettingsError(null);
      showToast({ type: 'success', message: t('storeSummary.storeUpdateSuccess') });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.storeUpdateError');
      setStoreSettingsError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsUpdatingStore(false);
    }
  };

  const handleRemoveStore = async () => {
    if (!store) {
      return;
    }

    try {
      setIsDeletingStore(true);
      await storeService.delete(store.id);
      showToast({ type: 'success', message: t('storeSummary.storeRemoveSuccess') });
      const redirectTo = `/admin/organizations?organizationId=${store.organizationId}`;
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : t('storeSummary.storeRemoveError');
      showToast({ type: 'error', message });
    } finally {
      setIsDeletingStore(false);
    }
  };

  const openDeleteStoreModal = () => {
    if (!store) {
      return;
    }

    setDeleteConfirmation({
      message: t('storeSummary.storeDeleteConfirm', { name: store.name }),
      description: t('storeSummary.storeDeleteWarning'),
      onConfirm: handleRemoveStore,
    });
  };

  const closeDeleteConfirmation = () => {
    if (isConfirmingDelete) {
      return;
    }

    setDeleteConfirmation(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) {
      return;
    }

    setIsConfirmingDelete(true);
    try {
      await deleteConfirmation.onConfirm();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  if (isLoadingStore) {
    return (
      <Layout>
        <section className="page-container">
          <PageLoader message={t('storeSummary.loadingStore')} />
        </section>
      </Layout>
    );
  }

  if (!store) {
    return (
      <Layout>
        <section className="page-container">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            ← {t('back')}
          </Button>
          <p className="section-subtitle">{t('storeSummary.notFound')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <section className="page-container">
          <div className="page-header">
            <div>
              <Button type="button" variant="ghost" onClick={() => navigate(`/stores/${store.id}`)}>
                ← {t('back')}
              </Button>
              <h1 className="section-title">{t('storeSummary.storeSettings')}</h1>
              <p className="section-subtitle">{store.name}</p>
            </div>
          </div>

          <div className="page-section">
            <div className="card">
              {storeSettingsError && (
                <p className="form-message form-message--error">{storeSettingsError}</p>
              )}
              <form
                className="form-grid"
                onSubmit={handleStoreSettingsSubmit}
                data-testid="store-settings-form"
              >
                <TextInput
                  id="store-settings-name"
                  label={t('storeSummary.storeName')}
                  value={storeSettings.name}
                  onChange={(event) =>
                    setStoreSettings((previous) => ({ ...previous, name: event.target.value }))
                  }
                  required
                  dataTestId="store-settings-name"
                />
                <TextInput
                  id="store-settings-site"
                  label={t('storeSummary.storeUrl')}
                  value={storeSettings.site}
                  onChange={(event) =>
                    setStoreSettings((previous) => ({ ...previous, site: event.target.value }))
                  }
                  required
                  dataTestId="store-settings-site"
                />
                <div className="form-actions">
                  <Button
                    type="submit"
                    isLoading={isUpdatingStore}
                    loadingText={t('storeSummary.saving')}
                    data-testid="save-store-settings"
                  >
                    {t('storeSummary.saveChanges')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>

              <div className="modal-danger-zone">
                <div>
                  <h4>{t('storeSummary.removeStore')}</h4>
                  <p>{t('storeSummary.removeStoreWarning')}</p>
                </div>
                <button
                  type="button"
                  className="link-danger"
                  onClick={openDeleteStoreModal}
                  disabled={isDeletingStore}
                  data-testid="delete-store-button"
                >
                  {t('storeSummary.removeStore')}
                </button>
              </div>
            </div>
          </div>

          {organization && (
            <div className="page-section">
              <OrganizationLogPanel organizationId={organization.id} />
            </div>
          )}
        </section>
      </Layout>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </>
  );
};
