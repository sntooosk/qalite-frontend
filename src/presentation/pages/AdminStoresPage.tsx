import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import type { Store } from '../../domain/entities/Store';
import type { ScenarioExecutionMetrics } from '../../application/services/ScenarioExecutionService';
import { organizationService, scenarioExecutionService, storeService } from '../../services';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { SimpleBarChart } from '../components/SimpleBarChart';
import {
  BarChartIcon,
  SparklesIcon,
  StorefrontIcon,
  TrophyIcon,
  UsersGroupIcon,
} from '../components/icons';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { formatDurationFromMs } from '../../shared/utils/time';

interface StoreForm {
  name: string;
  site: string;
}

interface OrganizationFormState {
  name: string;
  logoFile: File | null;
}

const initialStoreForm: StoreForm = {
  name: '',
  site: '',
};

const initialOrganizationForm: OrganizationFormState = {
  name: '',
  logoFile: null,
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
  const [isOrganizationModalOpen, setIsOrganizationModalOpen] = useState(false);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(initialOrganizationForm);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [storeAutomationCounts, setStoreAutomationCounts] = useState<Record<string, number>>({});
  const [isLoadingAutomationStats, setIsLoadingAutomationStats] = useState(false);
  const [metrics, setMetrics] = useState<ScenarioExecutionMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

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
      setMetrics(null);
      setMetricsError(null);
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

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    let isMounted = true;
    setIsLoadingMetrics(true);
    setMetricsError(null);

    const fetchMetrics = async () => {
      try {
        const data = await scenarioExecutionService.getOrganizationMetrics(selectedOrganizationId);
        if (isMounted) {
          setMetrics(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setMetricsError('Não foi possível carregar as métricas de execução desta organização.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingMetrics(false);
        }
      }
    };

    void fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [selectedOrganizationId]);

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

    setOrganizationForm({
      name: selectedOrganization.name,
      logoFile: null,
    });
    setOrganizationError(null);
    setMemberEmail('');
    setMemberError(null);
    setIsOrganizationModalOpen(true);
  };

  const closeOrganizationModal = () => {
    setIsOrganizationModalOpen(false);
    setOrganizationError(null);
    setMemberEmail('');
    setMemberError(null);
    setOrganizationForm(initialOrganizationForm);
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
      const updated = await organizationService.update(selectedOrganization.id, {
        name: trimmedName,
        description: (selectedOrganization.description ?? '').trim(),
        logoFile: organizationForm.logoFile,
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

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Deseja remover a organização "${selectedOrganization.name}"? Os usuários serão desvinculados.`,
    );

    if (!confirmation) {
      return;
    }

    try {
      setIsSavingOrganization(true);
      await organizationService.delete(selectedOrganization.id);
      const remainingOrganizations = organizations.filter(
        (item) => item.id !== selectedOrganization.id,
      );
      setOrganizations(remainingOrganizations);
      setStores([]);
      closeOrganizationModal();
      showToast({ type: 'success', message: 'Organização removida com sucesso.' });

      if (remainingOrganizations.length === 0) {
        setSelectedOrganizationId('');
        setSearchParams({});
        navigate('/admin');
      } else {
        const fallbackId = remainingOrganizations[0].id;
        setSelectedOrganizationId(fallbackId);
        setSearchParams({ organizationId: fallbackId });
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover a organização.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError(null);

    if (!selectedOrganization) {
      return;
    }

    const trimmedEmail = memberEmail.trim();
    if (!trimmedEmail) {
      setMemberError('Informe o e-mail do usuário.');
      return;
    }

    try {
      setIsManagingMembers(true);
      const member = await organizationService.addUser({
        organizationId: selectedOrganization.id,
        userEmail: trimmedEmail,
      });

      setOrganizations((previous) =>
        previous.map((organization) => {
          if (organization.id !== selectedOrganization.id) {
            return organization;
          }

          const hasMember = organization.memberIds.includes(member.uid);
          return {
            ...organization,
            members: hasMember ? organization.members : [...organization.members, member],
            memberIds: hasMember ? organization.memberIds : [...organization.memberIds, member.uid],
          };
        }),
      );

      setMemberEmail('');
      showToast({ type: 'success', message: 'Usuário adicionado à organização.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível adicionar o usuário.';
      setMemberError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!selectedOrganization) {
      return;
    }

    const confirmation = window.confirm(
      `Remover ${member.displayName || member.email} da organização ${selectedOrganization.name}?`,
    );

    if (!confirmation) {
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

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  const qaRanking = metrics?.qaRanking ?? [];
  const scenarioRanking = metrics?.scenarioRanking ?? [];
  const fastestScenario = scenarioRanking[0] ?? null;
  const hasExecutions = (metrics?.totalExecutions ?? 0) > 0;

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate('/admin')}>
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
              <Button type="button" variant="secondary" onClick={openOrganizationModal}>
                Gerenciar organização
              </Button>
            )}
            <Button type="button" onClick={openCreateModal} disabled={!selectedOrganizationId}>
              Nova loja
            </Button>
          </div>
        </div>

        {selectedOrganizationId && (
          <section className="organization-metrics">
            <div className="organization-metrics__header">
              <div>
                <p className="organization-metrics__kicker">Performance desta organização</p>
                <h2 className="organization-metrics__title">Ranking elegante de QAs</h2>
                <p className="organization-metrics__subtitle">
                  Acompanhe os tempos médios e melhores execuções registrados pelos times de QA.
                </p>
              </div>
              <div className="organization-metrics__meta">
                <span className="metrics-chip">
                  {isLoadingMetrics
                    ? 'Carregando...'
                    : `${metrics?.totalExecutions ?? 0} execução${
                        (metrics?.totalExecutions ?? 0) === 1 ? '' : 'es'
                      }`}
                </span>
                {fastestScenario && (
                  <span className="metrics-chip metrics-chip--muted">
                    Cenário destaque: {fastestScenario.scenarioTitle}
                  </span>
                )}
              </div>
            </div>

            {metricsError && (
              <p className="form-message form-message--error" style={{ marginBottom: '1rem' }}>
                {metricsError}
              </p>
            )}

            {isLoadingMetrics ? (
              <p className="section-subtitle">Coletando métricas e rankings...</p>
            ) : !metrics || !hasExecutions ? (
              <p className="organization-metrics__empty">
                Registre execuções dos cenários para desbloquear o ranking de QAs e cenários.
              </p>
            ) : (
              <>
                <div className="qa-podium card">
                  <div className="qa-podium__header">
                    <div>
                      <p className="qa-podium__kicker">Top 3 QAs</p>
                      <h3>Quem está no pódio?</h3>
                    </div>
                    <TrophyIcon className="qa-podium__icon" />
                  </div>
                  <div className="qa-podium__grid">
                    {[
                      { label: '2º lugar', index: 1, modifier: 'second' as const },
                      { label: '1º lugar', index: 0, modifier: 'first' as const },
                      { label: '3º lugar', index: 2, modifier: 'third' as const },
                    ].map((slot) => {
                      const entry = qaRanking[slot.index];
                      return (
                        <div
                          key={slot.label}
                          className={`qa-podium__item qa-podium__item--${slot.modifier}`}
                        >
                          <span className="qa-podium__label">{slot.label}</span>
                          {entry ? (
                            <>
                              <strong className="qa-podium__name">{entry.qaName}</strong>
                              <span className="qa-podium__time">
                                Média {formatDurationFromMs(entry.averageMs)}
                              </span>
                              <span className="qa-podium__time qa-podium__time--muted">
                                Melhor {formatDurationFromMs(entry.bestMs)}
                              </span>
                            </>
                          ) : (
                            <span className="qa-podium__placeholder">Aguardando execuções</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="metrics-card-grid">
                  <div className="metrics-card card">
                    <div className="metrics-card__header">
                      <h3>Ranking completo de QAs</h3>
                      <span>Tempo médio, melhor tempo e volume de execuções</span>
                    </div>
                    <div className="metrics-table-wrapper">
                      <table className="metrics-table">
                        <thead>
                          <tr>
                            <th>Posição</th>
                            <th>QA</th>
                            <th>Média</th>
                            <th>Melhor tempo</th>
                            <th>Execuções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qaRanking.map((entry, index) => (
                            <tr key={`${entry.qaId ?? entry.qaName}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{entry.qaName}</td>
                              <td>{formatDurationFromMs(entry.averageMs)}</td>
                              <td>{formatDurationFromMs(entry.bestMs)}</td>
                              <td>{entry.executions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="metrics-card card">
                    <div className="metrics-card__header">
                      <h3>Cenários mais rápidos</h3>
                      <span>Identifique oportunidades de aceleração</span>
                    </div>

                    {fastestScenario && (
                      <div className="scenario-highlight">
                        <SparklesIcon className="scenario-highlight__icon" />
                        <div>
                          <p className="scenario-highlight__label">Cenário destaque</p>
                          <strong className="scenario-highlight__title">
                            {fastestScenario.scenarioTitle}
                          </strong>
                          <p className="scenario-highlight__meta">
                            Média {formatDurationFromMs(fastestScenario.averageMs)} • Melhor tempo{' '}
                            {formatDurationFromMs(fastestScenario.bestMs)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="metrics-table-wrapper">
                      <table className="metrics-table">
                        <thead>
                          <tr>
                            <th>Posição</th>
                            <th>Cenário</th>
                            <th>Média</th>
                            <th>Melhor tempo</th>
                            <th>Execuções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenarioRanking.map((entry, index) => (
                            <tr key={`${entry.scenarioId}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{entry.scenarioTitle}</td>
                              <td>{formatDurationFromMs(entry.averageMs)}</td>
                              <td>{formatDurationFromMs(entry.bestMs)}</td>
                              <td>{entry.executions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

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
            <div className="dashboard-grid">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="card card-clickable"
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
        <form className="form-grid" onSubmit={handleStoreSubmit}>
          <TextInput
            id="store-name"
            label="Nome da loja"
            value={storeForm.name}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, name: event.target.value }))
            }
            placeholder="Ex.: Loja QA"
            required
          />
          <TextInput
            id="store-site"
            label="URL do site"
            value={storeForm.site}
            onChange={(event) =>
              setStoreForm((previous) => ({ ...previous, site: event.target.value }))
            }
            placeholder="https://minhaloja.com"
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isSavingStore} loadingText="Salvando...">
              Criar loja
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreModal}
              disabled={isSavingStore}
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

          <form className="form-grid" onSubmit={handleOrganizationSubmit}>
            <TextInput
              id="organization-name"
              label="Nome da organização"
              value={organizationForm.name}
              onChange={(event) =>
                setOrganizationForm((previous) => ({ ...previous, name: event.target.value }))
              }
              placeholder="Ex.: Squad de Onboarding"
              required
            />
            <label className="upload-label" htmlFor="organization-update-logo">
              <span>Logo da organização</span>
              <span className="upload-trigger">Atualizar logo</span>
              <input
                id="organization-update-logo"
                className="upload-input"
                type="file"
                accept="image/*"
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
              <Button type="submit" isLoading={isSavingOrganization} loadingText="Salvando...">
                Salvar alterações
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeOrganizationModal}
                disabled={isSavingOrganization}
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="card bg-surface" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Membros vinculados</h3>
                <p className="section-subtitle">
                  Adicione usuários pelo e-mail cadastrado no QaLite.
                </p>
              </div>
              <span className="badge">
                {selectedOrganization.members.length} membro
                {selectedOrganization.members.length === 1 ? '' : 's'}
              </span>
            </div>

            {memberError && (
              <p className="form-message form-message--error" style={{ marginTop: '1rem' }}>
                {memberError}
              </p>
            )}

            <form className="organization-members-form" onSubmit={handleAddMember}>
              <TextInput
                id="member-email"
                label="Adicionar usuário por e-mail"
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
              <Button type="submit" isLoading={isManagingMembers} loadingText="Adicionando...">
                Adicionar usuário
              </Button>
            </form>

            {selectedOrganization.members.length === 0 ? (
              <p className="section-subtitle">
                Nenhum usuário vinculado ainda. Adicione membros utilizando o e-mail cadastrado no
                QaLite.
              </p>
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
                      onClick={() => void handleRemoveMember(member)}
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
              onClick={() => void handleDeleteOrganization()}
              disabled={isSavingOrganization}
            >
              Excluir organização
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
