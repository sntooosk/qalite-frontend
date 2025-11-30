import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization, OrganizationMember } from '../../domain/entities/organization';
import type { Store } from '../../domain/entities/store';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { browserstackService } from '../../application/use-cases/BrowserstackUseCase';
import { userService } from '../../application/use-cases/UserUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';
import { BarChartIcon, SparklesIcon, StorefrontIcon, UsersGroupIcon } from '../components/icons';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { isAutomatedScenario } from '../../shared/utils/automation';
import type { UserSummary } from '../../domain/entities/user';

interface StoreForm {
  name: string;
  site: string;
}

interface OrganizationFormState {
  name: string;
  logoFile: File | null;
  slackWebhookUrl: string;
  emailDomain: string;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
};

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  logoFile: null,
  slackWebhookUrl: '',
  emailDomain: '',
};

export const AdminStoresPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
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
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [isOrganizationSlackSectionOpen, setIsOrganizationSlackSectionOpen] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [memberFormEmail, setMemberFormEmail] = useState('');
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSummary[]>([]);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [storeAutomationCounts, setStoreAutomationCounts] = useState<Record<string, number>>({});
  const [isLoadingAutomationStats, setIsLoadingAutomationStats] = useState(false);
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);

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
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      }
    };

    void fetchOrganizations();
  }, [searchParams, showToast]);

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
          message: 'Não foi possível carregar as lojas desta organização.',
        });
      } finally {
        setIsLoadingStores(false);
      }
    };

    void fetchStores();
  }, [selectedOrganizationId, setSearchParams, showToast]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );

  useEffect(() => {
    setActiveOrganization(selectedOrganization ?? null);
  }, [selectedOrganization, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  const loadAllUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const users = await userService.listAllSummaries();
      setAllUsers(users);
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível carregar os usuários cadastrados.' });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOrganizationModalOpen && allUsers.length === 0 && !isLoadingUsers) {
      void loadAllUsers();
    }
  }, [allUsers.length, isLoadingUsers, isOrganizationModalOpen, loadAllUsers]);

  useEffect(() => {
    const query = memberFormEmail.trim().toLowerCase();

    if (!query) {
      setSuggestedUsers([]);
      return;
    }

    const matches = allUsers
      .filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.displayName.toLowerCase().includes(query),
      )
      .slice(0, 5);

    setSuggestedUsers(matches);
  }, [allUsers, memberFormEmail]);

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
            message: 'Não foi possível carregar os cenários automatizados por loja.',
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
  }, [selectedOrganizationId, stores, showToast]);

  const hasBrowserstackCredentials = useMemo(
    () =>
      Boolean(user?.browserstackCredentials?.username && user?.browserstackCredentials?.accessKey),
    [user?.browserstackCredentials?.accessKey, user?.browserstackCredentials?.username],
  );

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!user?.browserstackCredentials || !hasBrowserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(user.browserstackCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as execuções do BrowserStack.';

      setBrowserstackBuilds([]);
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [hasBrowserstackCredentials, showToast, user?.browserstackCredentials]);

  useEffect(() => {
    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds]);

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrganization) {
      return;
    }

    const normalizedEmail = memberFormEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setMemberFormError('Informe um e-mail.');
      return;
    }

    if (
      selectedOrganization.members.some((member) => member.email.toLowerCase() === normalizedEmail)
    ) {
      setMemberFormError('Este usuário já faz parte da organização.');
      return;
    }

    try {
      setIsAddingMember(true);
      setIsManagingMembers(true);
      setMemberFormError(null);

      const newMember = await organizationService.addUser({
        organizationId: selectedOrganization.id,
        userEmail: normalizedEmail,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: [...organization.members, newMember],
                memberIds: [...organization.memberIds, newMember.uid],
              }
            : organization,
        ),
      );

      setMemberFormEmail('');
      showToast({ type: 'success', message: 'Usuário adicionado à organização.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível adicionar o usuário.';
      setMemberFormError(message);
    } finally {
      setIsAddingMember(false);
      setIsManagingMembers(false);
    }
  };

  const handleSelectSuggestedUser = (user: UserSummary) => {
    setMemberFormEmail(user.email);
  };

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

  const openOrganizationModal = () => {
    if (!selectedOrganization) {
      return;
    }

    const slackWebhookUrl = selectedOrganization.slackWebhookUrl ?? '';
    const emailDomain = selectedOrganization.emailDomain ?? '';

    setOrganizationForm({
      name: selectedOrganization.name,
      logoFile: null,
      slackWebhookUrl,
      emailDomain,
    });
    setIsOrganizationSlackSectionOpen(Boolean(slackWebhookUrl.trim()));
    setOrganizationError(null);
    setIsOrganizationModalOpen(true);
  };

  const closeOrganizationModal = () => {
    setIsOrganizationModalOpen(false);
    setOrganizationError(null);
    setIsOrganizationSlackSectionOpen(false);
    setOrganizationForm(initialOrganizationForm);
  };

  const toggleOrganizationSlackSection = () => {
    setIsOrganizationSlackSectionOpen((previous) => {
      const nextValue = !previous;

      if (!nextValue) {
        setOrganizationForm((form) => ({ ...form, slackWebhookUrl: '' }));
      }

      return nextValue;
    });
  };

  const handleStoreSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStoreError(null);

    const trimmedName = storeForm.name.trim();
    const trimmedSite = storeForm.site.trim();

    if (!selectedOrganizationId) {
      setStoreError('Selecione uma organização antes de cadastrar a loja.');
      return;
    }

    if (!trimmedName) {
      setStoreError('Informe o nome da loja.');
      return;
    }

    if (!trimmedSite) {
      setStoreError('Informe o site da loja.');
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
      showToast({ type: 'success', message: 'Nova loja cadastrada.' });
      closeStoreModal();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a loja.';
      setStoreError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleOrganizationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrganizationError(null);

    if (!selectedOrganization) {
      return;
    }

    const trimmedName = organizationForm.name.trim();
    if (!trimmedName) {
      setOrganizationError('Informe um nome para a organização.');
      return;
    }

    try {
      setIsSavingOrganization(true);
      const slackWebhookUrl = isOrganizationSlackSectionOpen
        ? organizationForm.slackWebhookUrl.trim()
        : '';
      const emailDomain = organizationForm.emailDomain.trim();

      const updated = await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: (selectedOrganization.description ?? '').trim(),
        logoFile: organizationForm.logoFile,
        slackWebhookUrl,
        emailDomain,
      });

      setOrganizations((previous) =>
        previous.map((organization) => (organization.id === updated.id ? updated : organization)),
      );
      showToast({ type: 'success', message: 'Organização atualizada com sucesso.' });
      closeOrganizationModal();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar a organização.';
      setOrganizationError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleDeleteOrganization = async (organization: Organization) => {
    try {
      setIsSavingOrganization(true);
      await organizationService.delete(organization.id);
      const remainingOrganizations = organizations.filter((item) => item.id !== organization.id);
      setOrganizations(remainingOrganizations);
      setStores([]);
      closeOrganizationModal();
      showToast({ type: 'success', message: 'Organização removida com sucesso.' });

      setSelectedOrganizationId('');
      setSearchParams({});
      navigate('/admin');
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover a organização.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    try {
      setIsManagingMembers(true);
      await organizationService.removeUser({
        organizationId: selectedOrganization.id,
        userId: member.uid,
      });

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === selectedOrganization.id
            ? {
                ...organization,
                members: organization.members.filter((item) => item.uid !== member.uid),
                memberIds: organization.memberIds.filter((item) => item !== member.uid),
              }
            : organization,
        ),
      );

      showToast({ type: 'success', message: 'Usuário removido da organização.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover o usuário.';
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const openDeleteOrganizationModal = () => {
    if (!selectedOrganization) {
      return;
    }

    setDeleteConfirmation({
      message: `Você deseja mesmo excluir a organização "${selectedOrganization.name}"?`,
      description: 'Os usuários serão desvinculados.',
      onConfirm: () => handleDeleteOrganization(selectedOrganization),
    });
  };

  const openRemoveMemberModal = (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    setDeleteConfirmation({
      message: `Você deseja mesmo excluir ${member.displayName || member.email}?`,
      description: `O usuário será removido da organização ${selectedOrganization.name}.`,
      onConfirm: () => handleRemoveMember(member),
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

    try {
      setIsConfirmingDelete(true);
      await deleteConfirmation.onConfirm();
    } finally {
      setIsConfirmingDelete(false);
      setDeleteConfirmation(null);
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
              &larr; Voltar
            </button>
            <h1 className="section-title">
              {selectedOrganization
                ? `Lojas da organização ${selectedOrganization.name}`
                : 'Lojas da organização'}
            </h1>
            <p className="section-subtitle">
              {isOrganizationLocked
                ? 'Para trocar a organização, utilize o botão Voltar e selecione outra opção.'
                : 'Escolha uma organização para visualizar e administrar suas lojas.'}
            </p>
          </div>
          <div className="page-actions">
            {selectedOrganization && (
              <Button
                type="button"
                variant="secondary"
                onClick={openOrganizationModal}
                data-testid="manage-organization-button"
              >
                Gerenciar organização
              </Button>
            )}
            <Button
              type="button"
              onClick={openCreateModal}
              disabled={!selectedOrganizationId}
              data-testid="new-store-button"
            >
              Nova loja
            </Button>
          </div>
        </div>

        {isLoadingStores ? (
          <p className="section-subtitle">Carregando lojas vinculadas...</p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma loja cadastrada</h2>
            <p className="section-subtitle">
              Utilize o botão acima para cadastrar a primeira loja desta organização.
            </p>
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              Nova loja
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
                    <span className="badge">{store.scenarioCount} cenários</span>
                  </div>
                  <div className="card-link-hint">
                    <span>Abrir loja</span>
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
                        <h3>Colaboradores da organização</h3>
                        <p className="section-subtitle">
                          Visualize rapidamente quem tem acesso a esta organização.
                        </p>
                      </div>
                    </div>
                    <span className="badge">
                      {selectedOrganization.members.length} colaborad
                      {selectedOrganization.members.length === 1 ? 'or' : 'ores'}
                    </span>
                  </div>
                  {selectedOrganization.members.length === 0 ? (
                    <p className="section-subtitle">
                      Nenhum colaborador vinculado. Utilize o botão “Gerenciar organização” para
                      convidar novos membros.
                    </p>
                  ) : (
                    <ul className="collaborator-list">
                      {selectedOrganization.members.map((member) => (
                        <li key={member.uid} className="collaborator-card">
                          <UserAvatar
                            name={member.displayName || member.email}
                            photoURL={member.photoURL ?? undefined}
                            size="sm"
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

              <section className="organization-charts-grid">
                <SimpleBarChart
                  title="Cenários por loja"
                  description="Total de cenários cadastrados em cada loja desta organização."
                  data={scenariosPerStoreData}
                  emptyMessage="Cadastre lojas e cenários para visualizar este gráfico."
                  icon={<BarChartIcon aria-hidden className="icon icon--lg" />}
                />
                <SimpleBarChart
                  title="Cenários automatizados"
                  description="Comparativo de cenários marcados como automatizados por loja."
                  data={automatedScenariosPerStoreData}
                  emptyMessage="Ainda não identificamos cenários automatizados nas lojas desta organização."
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
                  <span className="badge">BrowserStack</span>
                  <h2 className="section-title">Conecte sua conta</h2>
                  <p className="section-subtitle">
                    Adicione usuário e access key do BrowserStack no seu perfil para acompanhar as
                    execuções automatizadas.
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
        title="Nova loja"
        description="Informe os dados básicos da loja para disponibilizar os cenários."
      >
        {storeError && <p className="form-message form-message--error">{storeError}</p>}
        <form className="form-grid" onSubmit={handleStoreSubmit} data-testid="store-form">
          <TextInput
            id="store-name"
            label="Nome da loja"
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder="Ex.: Loja QA"
            required
            dataTestId="store-name-input"
          />
          <TextInput
            id="store-site"
            label="URL do site"
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            placeholder="https://minhaloja.com"
            dataTestId="store-site-input"
          />
          <div className="form-actions">
            <Button
              type="submit"
              isLoading={isSavingStore}
              loadingText="Salvando..."
              data-testid="save-store-button"
            >
              Criar loja
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
              data-testid="cancel-store-button"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {selectedOrganization && (
        <Modal
          isOpen={isOrganizationModalOpen}
          onClose={closeOrganizationModal}
          title={`Gerenciar ${selectedOrganization.name}`}
        >
          {organizationError && (
            <p className="form-message form-message--error">{organizationError}</p>
          )}

          <form
            className="form-grid"
            onSubmit={handleOrganizationSubmit}
            data-testid="organization-settings-form"
          >
            <TextInput
              id="organization-name"
              label="Nome da organização"
              value={organizationForm.name}
              onChange={(event) =>
                setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Ex.: Squad de Onboarding"
              required
              dataTestId="organization-settings-name"
            />
            <TextInput
              id="organization-email-domain"
              label="Domínio de e-mail da organização"
              value={organizationForm.emailDomain}
              onChange={(event) =>
                setOrganizationForm((previous) => ({
                  ...previous,
                  emailDomain: event.target.value,
                }))
              }
              placeholder="@exemplo.com"
              dataTestId="organization-settings-email-domain"
            />
            <p className="form-hint">
              Informe o domínio (com ou sem @). Usuários com esse e-mail entram automaticamente.
            </p>
            <div className="collapsible-section">
              <div className="collapsible-section__header">
                <div className="collapsible-section__titles">
                  <img
                    className="collapsible-section__icon"
                    src="https://img.icons8.com/external-tal-revivo-color-tal-revivo/48/external-slack-replace-email-text-messaging-and-instant-messaging-for-your-team-logo-color-tal-revivo.png"
                    alt="Slack"
                  />
                  <p className="collapsible-section__title">Webhook do Slack</p>
                  <p className="collapsible-section__description">
                    Deseja cadastrar um webhook para enviar notificações automáticas no Slack?
                  </p>
                </div>
                <label className="collapsible-section__toggle">
                  <input
                    type="checkbox"
                    checked={isOrganizationSlackSectionOpen}
                    onChange={toggleOrganizationSlackSection}
                    aria-expanded={isOrganizationSlackSectionOpen}
                    aria-controls="organization-settings-slack-section"
                  />
                  <span>{isOrganizationSlackSectionOpen ? 'Ativado' : 'Desativado'}</span>
                </label>
              </div>
              {isOrganizationSlackSectionOpen && (
                <div
                  className="collapsible-section__body"
                  id="organization-settings-slack-section"
                  data-testid="organization-settings-slack-section"
                >
                  <TextInput
                    id="organization-slack-webhook"
                    label="Webhook do Slack"
                    value={organizationForm.slackWebhookUrl}
                    onChange={(event) =>
                      setOrganizationForm((previous) => ({
                        ...previous,
                        slackWebhookUrl: event.target.value,
                      }))
                    }
                    placeholder="https://hooks.slack.com/services/..."
                    dataTestId="organization-settings-slack-webhook"
                  />
                  <p className="form-hint">
                    Cole a URL gerada pelo aplicativo de Incoming Webhooks.
                  </p>
                </div>
              )}
            </div>
            <label className="upload-label" htmlFor="organization-update-logo">
              <span>Logo da organização</span>
              <span className="upload-trigger">Atualizar logo</span>
              <input
                id="organization-update-logo"
                className="upload-input"
                type="file"
                accept="image/*"
                data-testid="organization-settings-logo"
                onChange={(event) =>
                  setOrganizationForm((previous) => ({
                    ...previous,
                    logoFile: event.target.files?.[0] ?? null,
                  }))
                }
              />
              <span className="upload-hint">Envie um arquivo PNG, JPG ou SVG até 5MB.</span>
            </label>
            <div className="form-actions">
              <Button
                type="submit"
                isLoading={isSavingOrganization}
                loadingText="Salvando..."
                data-testid="save-organization-settings"
              >
                Salvar alterações
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeOrganizationModal}
                disabled={isSavingOrganization}
                data-testid="cancel-organization-settings"
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="card bg-surface" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Membros vinculados</h3>
                <p className="section-subtitle">Visualize e gerencie os usuários da organização.</p>
              </div>
              <span className="badge">
                {selectedOrganization.members.length} membro
                {selectedOrganization.members.length === 1 ? '' : 's'}
              </span>
            </div>

            <form className="organization-members-form" onSubmit={handleAddMember}>
              <div>
                <TextInput
                  id="organization-add-member"
                  label="Adicionar membro por e-mail"
                  value={memberFormEmail}
                  onChange={(event) => setMemberFormEmail(event.target.value)}
                  placeholder="Digite o e-mail ou nome de usuário"
                  autoComplete="off"
                  dataTestId="organization-add-member-input"
                />
                {isLoadingUsers && (
                  <p className="form-hint" style={{ marginTop: '0.25rem' }}>
                    Carregando usuários cadastrados...
                  </p>
                )}
                {suggestedUsers.length > 0 && (
                  <ul className="member-suggestions">
                    {suggestedUsers.map((user) => (
                      <li key={user.id} className="member-suggestions__item">
                        <button
                          type="button"
                          className="member-suggestions__button"
                          onClick={() => handleSelectSuggestedUser(user)}
                        >
                          <UserAvatar
                            name={user.displayName || user.email}
                            photoURL={user.photoURL ?? undefined}
                            size="sm"
                          />
                          <div className="member-suggestions__details">
                            <span className="member-suggestions__name">{user.displayName}</span>
                            <span className="member-suggestions__email">{user.email}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {memberFormError && (
                  <p className="form-message form-message--error">{memberFormError}</p>
                )}
              </div>
              <div className="form-actions">
                <Button
                  type="submit"
                  isLoading={isAddingMember}
                  loadingText="Adicionando..."
                  disabled={isManagingMembers}
                  data-testid="add-organization-member-button"
                >
                  Adicionar membro
                </Button>
              </div>
            </form>

            {selectedOrganization.members.length === 0 ? (
              <p className="section-subtitle">Nenhum usuário vinculado ainda.</p>
            ) : (
              <ul className="member-list">
                {selectedOrganization.members.map((member) => (
                  <li key={member.uid} className="member-list-item">
                    <UserAvatar
                      name={member.displayName || member.email}
                      photoURL={member.photoURL ?? undefined}
                    />
                    <div className="member-list-details">
                      <span className="member-list-name">{member.displayName || member.email}</span>
                      <span className="member-list-email">{member.email}</span>
                    </div>
                    <button
                      type="button"
                      className="member-list-remove"
                      onClick={() => openRemoveMemberModal(member)}
                      disabled={isManagingMembers}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-danger-zone">
            <div>
              <h4>Zona sensível</h4>
              <p>Remova a organização e desvincule todos os usuários.</p>
            </div>
            <button
              type="button"
              className="link-danger"
              onClick={openDeleteOrganizationModal}
              disabled={isSavingOrganization}
              data-testid="delete-organization-button"
            >
              Excluir organização
            </button>
          </div>
        </Modal>
      )}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmation)}
        message={deleteConfirmation?.message}
        description={deleteConfirmation?.description}
        onClose={closeDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </Layout>
  );
};
