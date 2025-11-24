import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Environment } from '../../domain/entities/environment';
import type { EnvironmentBug } from '../../domain/entities/environment';
import type { OrganizationEvent } from '../../domain/entities/event';
import type { Store } from '../../domain/entities/store';
import { eventService } from '../../application/use-cases/EventUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import { SparklesIcon } from '../components/icons';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { ENVIRONMENT_STATUS_LABEL } from '../../shared/config/environmentLabels';
import { getReadableUserName, getUserInitials } from '../utils/userDisplay';
import { formatDateTime } from '../../shared/utils/time';
import { SCENARIO_COMPLETED_STATUSES } from '../../infrastructure/external/environments';

interface EventFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

const initialEventForm: EventFormState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
};

export const EventDashboardPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get('organizationId');
  const eventId = searchParams.get('eventId');

  const [event, setEvent] = useState<OrganizationEvent | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isLinkingEnvironment, setIsLinkingEnvironment] = useState(false);
  const [environmentToLink, setEnvironmentToLink] = useState('');
  const [bugsByEnvironment, setBugsByEnvironment] = useState<Record<string, EnvironmentBug[]>>({});
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(initialEventForm);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const storeNameMap = useMemo(
    () => Object.fromEntries(stores.map((store) => [store.id, store.name])),
    [stores],
  );

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const list = await organizationService.list();
        if (organizationId) {
          setActiveOrganization(list.find((item) => item.id === organizationId) ?? null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadOrganizations();
  }, [organizationId, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  useEffect(() => {
    if (!organizationId || !eventId) {
      setIsLoadingEvent(false);
      return;
    }

    const loadEvent = async () => {
      try {
        setIsLoadingEvent(true);
        const list = await eventService.listByOrganization(organizationId);
        const current = list.find((item) => item.id === eventId) ?? null;
        setEvent(current);
        if (current) {
          setEventForm({
            name: current.name,
            description: current.description ?? '',
            startDate: current.startDate ?? '',
            endDate: current.endDate ?? '',
          });
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar o evento.' });
      } finally {
        setIsLoadingEvent(false);
      }
    };

    void loadEvent();
  }, [eventId, organizationId, showToast]);

  useEffect(() => {
    if (!organizationId) {
      setStores([]);
      return;
    }

    const loadStores = async () => {
      try {
        const data = await storeService.listByOrganization(organizationId);
        setStores(data);
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: 'Não foi possível carregar as lojas da organização para exibir os ambientes.',
        });
      }
    };

    void loadStores();
  }, [organizationId, showToast]);

  useEffect(() => {
    if (stores.length === 0) {
      setEnvironments([]);
      setIsLoadingEnvironments(false);
      return;
    }

    setIsLoadingEnvironments(true);
    const unsubscribes = stores.map((store) =>
      environmentService.observeAll({ storeId: store.id }, (list) => {
        setEnvironments((previous) => {
          const others = previous.filter((environment) => environment.storeId !== store.id);
          return [...others, ...list];
        });
        setIsLoadingEnvironments(false);
      }),
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [stores]);

  const organizationEnvironments = useMemo(
    () => environments.filter((environment) => environment.storeId in storeNameMap),
    [environments, storeNameMap],
  );

  const linkedEnvironments = useMemo(
    () =>
      event
        ? organizationEnvironments.filter((environment) =>
            event.environmentIds.includes(environment.id),
          )
        : [],
    [organizationEnvironments, event],
  );

  const availableEnvironments = useMemo(
    () =>
      organizationEnvironments.filter(
        (environment) => !event?.environmentIds.includes(environment.id),
      ),
    [organizationEnvironments, event],
  );

  const participantSet = useMemo(() => {
    const participants = new Set<string>();

    linkedEnvironments.forEach((environment) => {
      environment.participants.forEach((participant) => participants.add(participant));
    });

    return participants;
  }, [linkedEnvironments]);

  const participantIds = useMemo(() => Array.from(participantSet), [participantSet]);
  const participantProfiles = useUserProfiles(participantIds);

  const scenarioIndex = useMemo(() => {
    const registry: Record<
      string,
      { scenario: Environment['scenarios'][string]; environmentId: string }
    > = {};

    linkedEnvironments.forEach((environment) => {
      Object.entries(environment.scenarios).forEach(([scenarioId, scenario]) => {
        registry[scenarioId] = { scenario, environmentId: environment.id };
      });
    });

    return registry;
  }, [linkedEnvironments]);

  const totalScenarios = useMemo(
    () => linkedEnvironments.reduce((total, environment) => total + environment.totalCenarios, 0),
    [linkedEnvironments],
  );

  const completedScenarios = useMemo(
    () =>
      linkedEnvironments.reduce((count, environment) => {
        const finished = Object.values(environment.scenarios).filter((scenario) =>
          ['concluido', 'concluido_automatizado', 'nao_se_aplica'].includes(scenario.status),
        ).length;

        return count + finished;
      }, 0),
    [linkedEnvironments],
  );

  const openScenarios = Math.max(totalScenarios - completedScenarios, 0);

  useEffect(() => {
    if (linkedEnvironments.length === 0) {
      setBugsByEnvironment({});
      return undefined;
    }

    const unsubscribers = linkedEnvironments.map((environment) =>
      environmentService.observeBugs(environment.id, (bugs) => {
        setBugsByEnvironment((previous) => ({ ...previous, [environment.id]: bugs }));
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [linkedEnvironments]);

  const allBugs = useMemo(() => Object.values(bugsByEnvironment).flat(), [bugsByEnvironment]);

  const testsByCategory = useMemo(() => {
    const categoryCounts = linkedEnvironments.reduce<Record<string, number>>((acc, environment) => {
      Object.values(environment.scenarios).forEach((scenario) => {
        const category = scenario.categoria?.trim() || 'Sem categoria';
        acc[category] = (acc[category] ?? 0) + 1;
      });
      return acc;
    }, {});

    const total = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [linkedEnvironments]);

  const environmentProgress = useMemo(
    () =>
      linkedEnvironments.map((environment) => {
        const scenarios = Object.values(environment.scenarios);
        const total = scenarios.length;
        const concluded = scenarios.filter((scenario) =>
          SCENARIO_COMPLETED_STATUSES.includes(scenario.status),
        ).length;
        const running = scenarios.filter((scenario) => scenario.status === 'em_andamento').length;
        const blocked = scenarios.filter((scenario) => scenario.status === 'bloqueado').length;
        const pending = Math.max(total - concluded - running - blocked, 0);
        const progress = total > 0 ? Math.round((concluded / total) * 1000) / 10 : 0;

        return { environment, total, concluded, running, blocked, pending, progress };
      }),
    [linkedEnvironments],
  );

  const timeInsights = useMemo(() => {
    const environmentsWithTime = linkedEnvironments.filter(
      (environment) => environment.timeTracking.totalMs > 0 || environment.timeTracking.start,
    );

    const concludedTimes = environmentsWithTime.filter(
      (environment) => environment.status === 'done',
    );

    const durations = concludedTimes.map((environment) => environment.timeTracking.totalMs);
    const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);
    const averageDurationMs = durations.length > 0 ? totalDurationMs / durations.length : 0;

    const earliestStart = environmentsWithTime.reduce<{
      timestamp: string;
      environmentId: string;
    } | null>((earliest, environment) => {
      if (!environment.timeTracking.start) return earliest;
      if (!earliest)
        return { timestamp: environment.timeTracking.start, environmentId: environment.id };
      return new Date(environment.timeTracking.start) < new Date(earliest.timestamp)
        ? { timestamp: environment.timeTracking.start, environmentId: environment.id }
        : earliest;
    }, null);

    const latestEnd = environmentsWithTime.reduce<{
      timestamp: string;
      environmentId: string;
    } | null>((latest, environment) => {
      if (!environment.timeTracking.end) return latest;
      if (!latest)
        return { timestamp: environment.timeTracking.end, environmentId: environment.id };
      return new Date(environment.timeTracking.end) > new Date(latest.timestamp)
        ? { timestamp: environment.timeTracking.end, environmentId: environment.id }
        : latest;
    }, null);

    const longestDuration = concludedTimes.reduce<{
      duration: number;
      environmentId: string;
    } | null>((longest, environment) => {
      const duration = environment.timeTracking.totalMs;
      if (!longest) return { duration, environmentId: environment.id };
      return duration > longest.duration ? { duration, environmentId: environment.id } : longest;
    }, null);

    return {
      environmentsWithTimeCount: environmentsWithTime.length,
      totalEnvironments: linkedEnvironments.length,
      averageDurationMs,
      totalDurationMs,
      earliestStart,
      latestEnd,
      longestDuration,
    };
  }, [linkedEnvironments]);

  const executionMetrics = useMemo(() => {
    const scenarios = linkedEnvironments.flatMap((environment) =>
      Object.values(environment.scenarios),
    );
    const total = scenarios.length;
    const concluded = scenarios.filter((scenario) =>
      SCENARIO_COMPLETED_STATUSES.includes(scenario.status),
    ).length;
    const blocked = scenarios.filter((scenario) => scenario.status === 'bloqueado').length;
    const pending = scenarios.filter((scenario) => scenario.status === 'pendente').length;
    const successRate = total > 0 ? Math.round((concluded / total) * 1000) / 10 : 0;
    const failureRate = total > 0 ? Math.round((blocked / total) * 1000) / 10 : 0;

    return { total, concluded, blocked, pending, successRate, failureRate };
  }, [linkedEnvironments]);

  const bugInsights = useMemo(() => {
    const severityCounts = allBugs.reduce<Record<string, number>>((acc, bug) => {
      const severity = bug.scenarioId ? scenarioIndex[bug.scenarioId]?.scenario.criticidade : null;
      const key = severity?.trim() || 'Não informado';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const reopened = 0;

    const impactedModules = allBugs.reduce<Set<string>>((modules, bug) => {
      const category = bug.scenarioId ? scenarioIndex[bug.scenarioId]?.scenario.categoria : null;
      if (category) modules.add(category);
      return modules;
    }, new Set<string>());

    return {
      total: allBugs.length,
      severityCounts,
      reopened,
      impactedModulesCount: impactedModules.size,
      impactedModulesBreakdown: impactedModules,
    };
  }, [allBugs, scenarioIndex]);

  const formatDurationLabel = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Não registrado';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [
      hours > 0 ? `${hours}h` : null,
      minutes > 0 ? `${minutes}min` : null,
      `${seconds}s`,
    ].filter(Boolean);

    return parts.join(' ');
  };

  const handleLinkEnvironment = async () => {
    if (!event || !environmentToLink) {
      showToast({ type: 'error', message: 'Selecione um ambiente para vincular.' });
      return;
    }

    try {
      setIsLinkingEnvironment(true);
      const updated = await eventService.addEnvironment(event.id, environmentToLink);
      setEvent(updated);
      setEnvironmentToLink('');
      showToast({ type: 'success', message: 'Ambiente vinculado ao evento.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível vincular o ambiente ao evento.';
      showToast({ type: 'error', message });
    } finally {
      setIsLinkingEnvironment(false);
    }
  };

  const handleUnlinkEnvironment = async (environmentId: string) => {
    if (!event) {
      return;
    }

    try {
      const updated = await eventService.removeEnvironment(event.id, environmentId);
      setEvent(updated);
      showToast({ type: 'success', message: 'Ambiente removido do evento.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível desvincular o ambiente.';
      showToast({ type: 'error', message });
    }
  };

  const handleOpenManageModal = () => {
    if (!event) return;
    setEventForm({
      name: event.name,
      description: event.description ?? '',
      startDate: event.startDate ?? '',
      endDate: event.endDate ?? '',
    });
    setIsManageModalOpen(true);
  };

  const handleCloseManageModal = () => {
    setIsManageModalOpen(false);
  };

  const handleOpenEnvironment = (environmentId: string) => {
    navigate(`/environments/${environmentId}`);
  };

  const handleGoBackToOrganization = () => {
    navigate(
      organizationId
        ? `/admin/organizations?organizationId=${organizationId}`
        : '/admin/organizations',
    );
  };

  const handleUpdateEvent = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!event) {
      return;
    }

    try {
      setIsSavingEvent(true);
      const updated = await eventService.update(event.id, {
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        startDate: eventForm.startDate || null,
        endDate: eventForm.endDate || null,
      });
      setEvent(updated);
      showToast({ type: 'success', message: 'Evento atualizado com sucesso.' });
      setIsManageModalOpen(false);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível atualizar o evento.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) {
      return;
    }

    const confirmation = window.confirm('Deseja realmente excluir este evento?');
    if (!confirmation) return;

    try {
      await eventService.delete(event.id);
      showToast({ type: 'success', message: 'Evento excluído com sucesso.' });
      handleGoBackToOrganization();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o evento.';
      showToast({ type: 'error', message });
    }
  };

  const renderEnvironmentLabel = (environment: Environment) => {
    const storeName = storeNameMap[environment.storeId] ?? 'Loja não encontrada';
    return `${environment.identificador} (${storeName})`;
  };

  const resolveEnvironmentLabel = (environmentId: string | undefined) => {
    const environment = linkedEnvironments.find((item) => item.id === environmentId);
    return environment ? renderEnvironmentLabel(environment) : 'Ambiente não encontrado';
  };

  const renderEnvironmentParticipants = (environment: Environment) => {
    const participants = participantProfiles.filter((profile) =>
      environment.participants.includes(profile.id),
    );
    const visibleParticipants = participants.slice(0, 4);
    const hiddenParticipantsCount = Math.max(participants.length - visibleParticipants.length, 0);

    if (participants.length === 0) {
      return <span className="environment-card-avatars__placeholder">Sem participantes</span>;
    }

    return (
      <>
        <ul className="environment-card-participant-list" aria-label="Participantes do ambiente">
          {visibleParticipants.map((user) => {
            const readableName = getReadableUserName(user);
            const initials = getUserInitials(readableName);
            return (
              <li key={user.id} className="environment-card-participant" title={readableName}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={readableName} className="environment-card-avatar" />
                ) : (
                  <span
                    className="environment-card-avatar environment-card-avatar--initials"
                    aria-label={readableName}
                  >
                    {initials}
                  </span>
                )}
              </li>
            );
          })}
          {hiddenParticipantsCount > 0 && (
            <li className="environment-card-participant environment-card-participant--more">
              +{hiddenParticipantsCount}
            </li>
          )}
        </ul>
        <span className="environment-card-participants-label">
          {participants.length} participante{participants.length > 1 ? 's' : ''}
        </span>
      </>
    );
  };

  if (!organizationId || !eventId) {
    return (
      <Layout>
        <section className="page-container">
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Evento não encontrado</h2>
            <p className="section-subtitle">
              Informe uma organização e evento válidos para acessar o dashboard.
            </p>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container" data-testid="organization-event-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">{event?.name ?? 'Evento'}</h1>
            <p className="section-subtitle">
              Edite, exclua e acompanhe o desempenho dos ambientes e participantes deste evento.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              className="link-button"
              data-testid="stores-back-button"
              onClick={handleGoBackToOrganization}
            >
              ← Voltar
            </button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenManageModal}
              disabled={!event}
            >
              Gerenciar evento
            </Button>
          </div>
        </div>

        {isLoadingEvent ? (
          <p className="section-subtitle">Carregando evento...</p>
        ) : !event ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Evento não encontrado</h2>
            <p className="section-subtitle">Selecione outro evento na lista da organização.</p>
          </div>
        ) : (
          <>
            <section className="card">
              <div className="section-heading">
                <span className="section-heading__icon" aria-hidden>
                  <SparklesIcon className="icon icon--lg" />
                </span>
                <div>
                  <h2>Ambientes do evento</h2>
                  <p className="section-subtitle">
                    Consulte os ambientes vinculados, vincule novos e desvincule diretamente pelos
                    cards.
                  </p>
                </div>
              </div>

              <div className="form-grid environment-linker">
                <SelectInput
                  id="environment-selector"
                  label="Adicionar ambiente"
                  value={environmentToLink}
                  options={
                    availableEnvironments.length > 0
                      ? [
                          { value: '', label: 'Selecione um ambiente para vincular' },
                          ...availableEnvironments.map((environment) => ({
                            value: environment.id,
                            label: renderEnvironmentLabel(environment),
                          })),
                        ]
                      : [
                          {
                            value: '',
                            label: isLoadingEnvironments
                              ? 'Carregando ambientes...'
                              : 'Nenhum ambiente disponível',
                          },
                        ]
                  }
                  onChange={(eventChange) => setEnvironmentToLink(eventChange.target.value)}
                  disabled={availableEnvironments.length === 0 || isLoadingEnvironments}
                />

                <Button
                  type="button"
                  onClick={handleLinkEnvironment}
                  disabled={isLinkingEnvironment}
                >
                  {isLinkingEnvironment ? 'Vinculando...' : 'Vincular ambiente'}
                </Button>
              </div>

              {linkedEnvironments.length === 0 ? (
                <p className="section-subtitle">
                  Nenhum ambiente vinculado ao evento. Selecione um para começar a acompanhar.
                </p>
              ) : (
                <div className="environment-kanban-columns">
                  {linkedEnvironments.map((environment) => {
                    const participants = participantProfiles.filter((profile) =>
                      environment.participants.includes(profile.id),
                    );
                    return (
                      <article
                        key={environment.id}
                        className={`environment-card ${
                          environment.status === 'done' ? 'is-locked' : ''
                        }`}
                        aria-label={`Ambiente ${environment.identificador}`}
                        onClick={() => handleOpenEnvironment(environment.id)}
                      >
                        <div className="environment-card-header">
                          <div className="environment-card-title">
                            <span className="environment-card-identifier">
                              {environment.identificador}
                            </span>
                            <span className="environment-card-type">
                              {renderEnvironmentLabel(environment)}
                            </span>
                            <span className="environment-card-badge">Evento</span>
                          </div>
                          <span
                            className={`environment-card-status-dot environment-card-status-dot--${environment.status}`}
                          >
                            {ENVIRONMENT_STATUS_LABEL[environment.status]}
                          </span>
                        </div>

                        <div className="environment-card-suite-row">
                          <span className="environment-card-suite-label">Tipo de teste</span>
                          <span className="environment-card-suite-name">
                            {environment.tipoTeste}
                          </span>
                        </div>

                        <div className="environment-card-stats">
                          <div className="environment-card-stat">
                            <span className="environment-card-stat-label">Cenários</span>
                            <strong className="environment-card-stat-value">
                              {Object.keys(environment.scenarios).length}
                            </strong>
                          </div>
                          <div className="environment-card-stat">
                            <span className="environment-card-stat-label">Participantes</span>
                            <strong className="environment-card-stat-value">
                              {participants.length}
                            </strong>
                          </div>
                        </div>

                        <div
                          className="environment-card-participants"
                          aria-label="Participantes do ambiente"
                        >
                          {renderEnvironmentParticipants(environment)}
                        </div>

                        <div className="environment-card-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={(buttonEvent) => {
                              buttonEvent.stopPropagation();
                              void handleUnlinkEnvironment(environment.id);
                            }}
                          >
                            Desvincular
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card">
              <div className="section-heading">
                <span className="section-heading__icon" aria-hidden>
                  <SparklesIcon className="icon icon--lg" />
                </span>
                <div>
                  <h3>Resumo executivo</h3>
                  <p className="section-subtitle">
                    Métricas consolidadas em estilo Power BI/Grafana para o evento selecionado.
                  </p>
                </div>
              </div>

              <div className="content-grid">
                <div className="card card-highlight">
                  <span className="badge">Cenários</span>
                  <h4 className="card-title">{totalScenarios}</h4>
                  <p className="section-subtitle">Total de cenários mapeados nos ambientes</p>
                </div>
                <div className="card card-highlight">
                  <span className="badge">Concluídos</span>
                  <h4 className="card-title">{completedScenarios}</h4>
                  <p className="section-subtitle">Cenários finalizados ou automatizados</p>
                </div>
                <div className="card card-highlight">
                  <span className="badge">Pendentes</span>
                  <h4 className="card-title">{openScenarios}</h4>
                  <p className="section-subtitle">Cenários aguardando execução</p>
                </div>
                <div className="card card-highlight">
                  <span className="badge">Participantes</span>
                  <h4 className="card-title">{participantSet.size}</h4>
                  <p className="section-subtitle">Pessoas envolvidas nos testes</p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="section-heading">
                <span className="section-heading__icon" aria-hidden>
                  <SparklesIcon className="icon icon--lg" />
                </span>
                <div>
                  <h3>Insights do evento</h3>
                  <p className="section-subtitle">
                    Dados reais a partir dos ambientes vinculados, cenários e bugs registrados.
                  </p>
                </div>
              </div>

              <div className="insights-grid">
                <div className="insight-panel">
                  <header className="insight-panel__header">
                    <div>
                      <p className="insight-panel__eyebrow">Testes por categoria</p>
                      <h4 className="insight-panel__title">
                        O cálculo considera os ambientes vinculados a este evento.
                      </h4>
                    </div>
                    <div className="insight-panel__total">
                      <strong className="insight-panel__total-value">{totalScenarios}</strong>
                      <span className="insight-panel__total-label">Testes</span>
                    </div>
                  </header>
                  {testsByCategory.length === 0 ? (
                    <p className="section-subtitle">
                      Nenhum teste categorizado nos ambientes vinculados.
                    </p>
                  ) : (
                    <ul className="insight-list">
                      {testsByCategory.map((entry) => (
                        <li key={entry.category} className="insight-list__item">
                          <div>
                            <p className="insight-list__title">{entry.category}</p>
                            <p className="insight-list__subtitle">
                              {entry.count} teste{entry.count !== 1 ? 's' : ''} · {entry.percentage}
                              %
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="insight-panel">
                  <p className="insight-panel__eyebrow">Análise por ambiente</p>
                  <h4 className="insight-panel__title">
                    Veja o andamento dos testes em cada ambiente participante do evento.
                  </h4>
                  {environmentProgress.length === 0 ? (
                    <p className="section-subtitle">
                      Nenhum ambiente participante para exibir progresso.
                    </p>
                  ) : (
                    <ul className="insight-list">
                      {environmentProgress.map((entry) => (
                        <li key={entry.environment.id} className="insight-list__item">
                          <div>
                            <p className="insight-list__title">{entry.environment.identificador}</p>
                            <p className="insight-list__subtitle">
                              {renderEnvironmentLabel(entry.environment)}
                            </p>
                            <p className="insight-list__meta">
                              {ENVIRONMENT_STATUS_LABEL[entry.environment.status]} •{' '}
                              {entry.environment.tipoTeste}
                            </p>
                            <p className="insight-list__subtitle insight-list__subtitle--strong">
                              {entry.concluded} de {entry.total} testes concluídos ({entry.progress}
                              %).
                            </p>
                            <p className="insight-list__meta">
                              {entry.running} em andamento · {entry.blocked} bloqueados ·{' '}
                              {entry.pending} pendentes
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="insight-panel">
                  <p className="insight-panel__eyebrow">Tempo de testes</p>
                  <h4 className="insight-panel__title">
                    Aproveite os registros de início, fim e duração para entender o ritmo de
                    execução dos ambientes.
                  </h4>
                  <div className="insight-stats-grid">
                    <div>
                      <p className="insight-stat__label">Ambientes com tempo registrado</p>
                      <p className="insight-stat__value">
                        {timeInsights.environmentsWithTimeCount} de {timeInsights.totalEnvironments}
                      </p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Duração média concluída</p>
                      <p className="insight-stat__value">
                        {formatDurationLabel(timeInsights.averageDurationMs)}
                      </p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Tempo total consolidado</p>
                      <p className="insight-stat__value">
                        {formatDurationLabel(timeInsights.totalDurationMs)}
                      </p>
                      <p className="insight-stat__helper">Soma das durações concluídas</p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Início mais cedo</p>
                      <p className="insight-stat__value">
                        {timeInsights.earliestStart
                          ? formatDateTime(timeInsights.earliestStart.timestamp)
                          : 'Não registrado'}
                      </p>
                      {timeInsights.earliestStart && (
                        <p className="insight-stat__helper">
                          {resolveEnvironmentLabel(timeInsights.earliestStart.environmentId)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="insight-stat__label">Conclusão mais recente</p>
                      <p className="insight-stat__value">
                        {timeInsights.latestEnd
                          ? formatDateTime(timeInsights.latestEnd.timestamp)
                          : 'Não registrado'}
                      </p>
                      {timeInsights.latestEnd && (
                        <p className="insight-stat__helper">
                          {resolveEnvironmentLabel(timeInsights.latestEnd.environmentId)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="insight-stat__label">Maior duração registrada</p>
                      <p className="insight-stat__value">
                        {timeInsights.longestDuration
                          ? formatDurationLabel(timeInsights.longestDuration.duration)
                          : 'Não registrado'}
                      </p>
                      {timeInsights.longestDuration && (
                        <p className="insight-stat__helper">
                          {resolveEnvironmentLabel(timeInsights.longestDuration.environmentId)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="insight-panel">
                  <p className="insight-panel__eyebrow">Métricas de execução</p>
                  <h4 className="insight-panel__title">
                    Acompanhe pendências, bloqueios e outras métricas de execução considerando todos
                    os ambientes do evento.
                  </h4>
                  <div className="insight-stats-grid">
                    <div>
                      <p className="insight-stat__label">Cenários pendentes</p>
                      <p className="insight-stat__value">{executionMetrics.pending}</p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Taxa de sucesso</p>
                      <p className="insight-stat__value">{executionMetrics.successRate}%</p>
                      <p className="insight-stat__helper">
                        {executionMetrics.concluded} execuções aprovadas
                      </p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Taxa de falha</p>
                      <p className="insight-stat__value">{executionMetrics.failureRate}%</p>
                      <p className="insight-stat__helper">
                        {executionMetrics.blocked} execuções bloqueadas
                      </p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Execuções bloqueadas</p>
                      <p className="insight-stat__value">{executionMetrics.blocked}</p>
                    </div>
                  </div>
                </div>

                <div className="insight-panel">
                  <p className="insight-panel__eyebrow">Análise de bugs</p>
                  <h4 className="insight-panel__title">
                    Verifique severidade, reaberturas e módulos afetados pelos bugs encontrados
                    durante o evento.
                  </h4>
                  <div className="insight-stats-grid">
                    <div>
                      <p className="insight-stat__label">Bugs por severidade</p>
                      <p className="insight-stat__value">{bugInsights.total}</p>
                      <ul className="insight-list insight-list--compact">
                        {Object.entries(bugInsights.severityCounts).map(([severity, count]) => (
                          <li key={severity} className="insight-list__item">
                            <p className="insight-list__title">{severity}</p>
                            <p className="insight-list__subtitle">
                              {count} ·{' '}
                              {bugInsights.total > 0
                                ? Math.round((count / bugInsights.total) * 1000) / 10
                                : 0}
                              %
                            </p>
                          </li>
                        ))}
                        {bugInsights.total === 0 && (
                          <li className="insight-list__item">
                            <p className="insight-list__subtitle">Nenhum bug registrado.</p>
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="insight-stat__label">Bugs reabertos</p>
                      <p className="insight-stat__value">{bugInsights.reopened}</p>
                    </div>
                    <div>
                      <p className="insight-stat__label">Módulos impactados</p>
                      <p className="insight-stat__value">{bugInsights.impactedModulesCount}</p>
                      {bugInsights.impactedModulesBreakdown.size > 0 && (
                        <p className="insight-stat__helper">
                          {Array.from(bugInsights.impactedModulesBreakdown).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      <Modal isOpen={isManageModalOpen} onClose={handleCloseManageModal} title="Gerenciar evento">
        <form className="form-grid" onSubmit={handleUpdateEvent}>
          <TextInput
            id="event-name"
            label="Nome do evento"
            value={eventForm.name}
            onChange={(changeEvent) =>
              setEventForm((previous) => ({ ...previous, name: changeEvent.target.value }))
            }
            required
          />

          <TextArea
            id="event-description"
            label="Descrição"
            value={eventForm.description}
            onChange={(changeEvent) =>
              setEventForm((previous) => ({ ...previous, description: changeEvent.target.value }))
            }
            placeholder="Contexto, objetivos e metas do evento"
          />

          <TextInput
            id="event-start-date"
            label="Data de início"
            type="date"
            value={eventForm.startDate}
            onChange={(changeEvent) =>
              setEventForm((previous) => ({ ...previous, startDate: changeEvent.target.value }))
            }
          />

          <TextInput
            id="event-end-date"
            label="Data de fim"
            type="date"
            value={eventForm.endDate}
            onChange={(changeEvent) =>
              setEventForm((previous) => ({ ...previous, endDate: changeEvent.target.value }))
            }
          />

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={handleCloseManageModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingEvent}>
              {isSavingEvent ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>

        <div className="divider" />

        <div className="section-subtitle">
          Utilize os cards de ambiente no dashboard para vincular e desvincular ambientes.
        </div>

        <div className="modal-danger-zone">
          <div>
            <h4>Zona sensível</h4>
            <p>Remova o evento e desvincule todos os ambientes e participantes.</p>
          </div>
          <button
            type="button"
            className="link-danger"
            data-testid="delete-event-button"
            onClick={handleDeleteEvent}
            disabled={!event}
          >
            Excluir evento
          </button>
        </div>
      </Modal>
    </Layout>
  );
};
