import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import type { OrganizationEvent } from '../../domain/entities/event';
import type { Store } from '../../domain/entities/store';
import type { Environment, EnvironmentScenarioStatus } from '../../domain/entities/environment';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { eventService } from '../../application/use-cases/EventUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import { SimpleBarChart } from '../components/SimpleBarChart';
import {
  BarChartIcon,
  ChevronDownIcon,
  SparklesIcon,
  UsersGroupIcon,
  ActivityIcon,
} from '../components/icons';

interface EventFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  environmentId: string;
}

const initialEventForm: EventFormState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  environmentId: '',
};

const scenarioStatusOrder: EnvironmentScenarioStatus[] = [
  'pendente',
  'em_andamento',
  'bloqueado',
  'concluido',
  'concluido_automatizado',
  'nao_se_aplica',
];

const scenarioStatusLabel: Record<EnvironmentScenarioStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
  concluido_automatizado: 'Automatizado',
  nao_se_aplica: 'N/A',
};

export const OrganizationEventsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [events, setEvents] = useState<OrganizationEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(initialEventForm);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [environmentToLink, setEnvironmentToLink] = useState('');
  const [isLinkingEnvironment, setIsLinkingEnvironment] = useState(false);

  const storeNameMap = useMemo(
    () => Object.fromEntries(stores.map((store) => [store.id, store.name])),
    [stores],
  );

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const data = await organizationService.list();
        setOrganizations(data);
        const paramOrganizationId = searchParams.get('organizationId');
        const existsInList = data.some((item) => item.id === paramOrganizationId);

        if (existsInList && paramOrganizationId) {
          setSelectedOrganizationId(paramOrganizationId);
          return;
        }

        if (data.length > 0) {
          setSelectedOrganizationId(data[0].id);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as organizações.' });
      }
    };

    void loadOrganizations();
  }, [searchParams, showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setEvents([]);
      setStores([]);
      setEnvironments([]);
      setActiveOrganization(null);
      return;
    }

    setActiveOrganization(
      organizations.find((organization) => organization.id === selectedOrganizationId) ?? null,
    );
  }, [organizations, selectedOrganizationId, setActiveOrganization]);

  useEffect(() => () => setActiveOrganization(null), [setActiveOrganization]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const items = await eventService.listByOrganization(selectedOrganizationId);
        setEvents(items);
        setSelectedEventId((previous) => {
          if (previous && items.some((item) => item.id === previous)) {
            return previous;
          }

          return items[0]?.id ?? '';
        });
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar os eventos.' });
      } finally {
        setIsLoadingEvents(false);
      }
    };

    void loadEvents();
  }, [selectedOrganizationId, showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setStores([]);
      setSearchParams({});
      return;
    }

    const loadStores = async () => {
      try {
        const data = await storeService.listByOrganization(selectedOrganizationId);
        setStores(data);
        setSearchParams({ organizationId: selectedOrganizationId });
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          message: 'Não foi possível carregar as lojas da organização para exibir os ambientes.',
        });
      }
    };

    void loadStores();
  }, [selectedOrganizationId, setSearchParams, showToast]);

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

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const organizationEnvironments = useMemo(
    () => environments.filter((environment) => environment.storeId in storeNameMap),
    [environments, storeNameMap],
  );

  const linkedEnvironments = useMemo(
    () =>
      selectedEvent
        ? organizationEnvironments.filter((environment) =>
            selectedEvent.environmentIds.includes(environment.id),
          )
        : [],
    [organizationEnvironments, selectedEvent],
  );

  const availableEnvironments = useMemo(
    () =>
      organizationEnvironments.filter(
        (environment) => !selectedEvent?.environmentIds.includes(environment.id),
      ),
    [organizationEnvironments, selectedEvent],
  );

  const scenarioStatusCounts = useMemo(() => {
    const counts: Record<EnvironmentScenarioStatus, number> = {
      pendente: 0,
      em_andamento: 0,
      bloqueado: 0,
      concluido: 0,
      concluido_automatizado: 0,
      nao_se_aplica: 0,
    };

    linkedEnvironments.forEach((environment) => {
      Object.values(environment.scenarios).forEach((scenario) => {
        counts[scenario.status] += 1;
      });
    });

    return counts;
  }, [linkedEnvironments]);

  const participantSet = useMemo(() => {
    const participants = new Set<string>();

    linkedEnvironments.forEach((environment) => {
      environment.participants.forEach((participant) => participants.add(participant));
    });

    return participants;
  }, [linkedEnvironments]);

  const environmentStatusCounts = useMemo(() => {
    if (linkedEnvironments.length === 0) {
      return { backlog: 0, in_progress: 0, done: 0 } as const;
    }

    return linkedEnvironments.reduce(
      (acc, environment) => ({
        ...acc,
        [environment.status]: acc[environment.status] + 1,
      }),
      { backlog: 0, in_progress: 0, done: 0 } as const,
    );
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

  const handleOpenCreateModal = () => {
    setIsEventModalOpen(true);
    setFormError(null);
    setEventForm((previous) => ({ ...initialEventForm, environmentId: previous.environmentId }));
  };

  const handleCloseModal = () => {
    setIsEventModalOpen(false);
    setFormError(null);
    setEventForm(initialEventForm);
  };

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganizationId) {
      showToast({ type: 'error', message: 'Selecione uma organização para criar o evento.' });
      return;
    }

    if (!eventForm.name.trim()) {
      setFormError('Informe um nome para o evento.');
      return;
    }

    try {
      setIsSavingEvent(true);
      const created = await eventService.create({
        organizationId: selectedOrganizationId,
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        startDate: eventForm.startDate || null,
        endDate: eventForm.endDate || null,
        environmentIds: eventForm.environmentId ? [eventForm.environmentId] : [],
      });

      setEvents((previous) => [created, ...previous]);
      setSelectedEventId(created.id);
      handleCloseModal();
      showToast({ type: 'success', message: 'Evento criado com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível criar o evento.';
      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleLinkEnvironment = async () => {
    if (!selectedEvent || !environmentToLink) {
      setFormError('Selecione um ambiente para vincular.');
      return;
    }

    try {
      setIsLinkingEnvironment(true);
      const updated = await eventService.addEnvironment(selectedEvent.id, environmentToLink);
      setEvents((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
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
    if (!selectedEvent) {
      return;
    }

    try {
      const updated = await eventService.removeEnvironment(selectedEvent.id, environmentId);
      setEvents((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      showToast({ type: 'success', message: 'Ambiente removido do evento.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível desvincular o ambiente.';
      showToast({ type: 'error', message });
    }
  };

  const renderEnvironmentLabel = (environment: Environment) => {
    const storeName = storeNameMap[environment.storeId] ?? 'Loja não encontrada';
    return `${environment.identificador} (${storeName})`;
  };

  const scenarioChartData = scenarioStatusOrder.map((status) => ({
    label: scenarioStatusLabel[status],
    value: scenarioStatusCounts[status],
  }));

  const participantsChartData = linkedEnvironments.map((environment) => ({
    label: renderEnvironmentLabel(environment),
    value: environment.participants.length,
  }));

  const environmentChartData = (
    [
      { label: 'Backlog', value: environmentStatusCounts.backlog },
      { label: 'Em andamento', value: environmentStatusCounts.in_progress },
      { label: 'Concluído', value: environmentStatusCounts.done },
    ] as const
  ).filter((entry) => entry.value > 0);

  return (
    <Layout>
      <section className="page-container" data-testid="organization-events-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">Eventos da organização</h1>
            <p className="section-subtitle">
              Crie jornadas de testes com ambientes associados e acompanhe métricas em tempo real.
            </p>
          </div>
          <div className="page-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/organizations')}
            >
              Voltar para organizações
            </Button>
            <Button type="button" onClick={handleOpenCreateModal} data-testid="new-event-button">
              Novo evento
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <span className="section-heading__icon" aria-hidden>
              <ActivityIcon className="icon icon--lg" />
            </span>
            <div>
              <h2>Selecione a organização</h2>
              <p className="section-subtitle">
                Os eventos e ambientes exibidos abaixo são exclusivos da organização escolhida.
              </p>
            </div>
          </div>
          <div className="form-grid">
            <SelectInput
              id="organization-selector"
              label="Organização"
              value={selectedOrganizationId}
              options={
                organizations.length > 0
                  ? organizations.map((organization) => ({
                      value: organization.id,
                      label: organization.name,
                    }))
                  : [{ value: '', label: 'Nenhuma organização cadastrada' }]
              }
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              disabled={organizations.length === 0}
            />

            <SelectInput
              id="event-selector"
              label="Evento"
              value={selectedEventId}
              options={
                events.length > 0
                  ? events.map((item) => ({ value: item.id, label: item.name }))
                  : [
                      {
                        value: '',
                        label: isLoadingEvents ? 'Carregando eventos...' : 'Nenhum evento',
                      },
                    ]
              }
              onChange={(event) => setSelectedEventId(event.target.value)}
              disabled={events.length === 0 || isLoadingEvents}
            />
          </div>
        </div>

        {events.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhum evento disponível</h2>
            <p className="section-subtitle">
              Crie um evento para acompanhar o desempenho dos ambientes e dos participantes.
            </p>
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={!selectedOrganizationId}
            >
              Novo evento
            </Button>
          </div>
        ) : (
          <>
            <section className="dashboard-grid">
              {events.map((item) => (
                <article
                  key={item.id}
                  className={`card card-clickable${item.id === selectedEventId ? ' card-selected' : ''}`}
                  onClick={() => setSelectedEventId(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="card-header">
                    <div className="section-heading">
                      <span className="section-heading__icon" aria-hidden>
                        <BarChartIcon className="icon" />
                      </span>
                      <div>
                        <span className="badge">{item.environmentIds.length} ambiente(s)</span>
                        <h3 className="card-title">{item.name}</h3>
                      </div>
                    </div>
                    <ChevronDownIcon className="icon icon--rotate" aria-hidden />
                  </div>
                  <p className="section-subtitle">{item.description || 'Sem descrição'}</p>
                  <div className="card-footer">
                    <span className="badge badge--muted">
                      {item.startDate ? `Início: ${item.startDate}` : 'Início não definido'}
                    </span>
                    <span className="badge badge--muted">
                      {item.endDate ? `Fim: ${item.endDate}` : 'Fim não definido'}
                    </span>
                  </div>
                </article>
              ))}
            </section>

            {selectedEvent && (
              <>
                <section className="card">
                  <div className="section-heading">
                    <span className="section-heading__icon" aria-hidden>
                      <SparklesIcon className="icon icon--lg" />
                    </span>
                    <div>
                      <h2>Ambientes do evento</h2>
                      <p className="section-subtitle">
                        Vincule ou remova ambientes para alimentar os relatórios e dashboards.
                      </p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <SelectInput
                      id="environment-selector"
                      label="Ambiente"
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
                      onChange={(event) => setEnvironmentToLink(event.target.value)}
                      disabled={availableEnvironments.length === 0 || isLoadingEnvironments}
                    />

                    <div className="field">
                      <span className="field-label">&nbsp;</span>
                      <Button
                        type="button"
                        onClick={handleLinkEnvironment}
                        disabled={isLinkingEnvironment || !environmentToLink}
                      >
                        Vincular ambiente
                      </Button>
                    </div>
                  </div>

                  {linkedEnvironments.length === 0 ? (
                    <p className="section-subtitle">
                      Nenhum ambiente vinculado. Selecione acima para alimentar o evento.
                    </p>
                  ) : (
                    <ul className="environment-list">
                      {linkedEnvironments.map((environment) => (
                        <li key={environment.id} className="environment-list__item">
                          <div>
                            <p className="text-base font-semibold">{environment.identificador}</p>
                            <p className="section-subtitle">
                              {renderEnvironmentLabel(environment)}
                            </p>
                          </div>
                          <div className="environment-list__actions">
                            <span className="badge">Status: {environment.status}</span>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleUnlinkEnvironment(environment.id)}
                            >
                              Desvincular
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="organization-charts-grid">
                  <SimpleBarChart
                    title="Progresso dos cenários"
                    description="Status dos cenários vinculados aos ambientes do evento."
                    data={scenarioChartData}
                    emptyMessage="Vincule ambientes com cenários para visualizar o progresso."
                    icon={<BarChartIcon aria-hidden className="icon icon--lg" />}
                  />

                  <SimpleBarChart
                    title="Participação por ambiente"
                    description="Total de participantes únicos por ambiente do evento."
                    data={participantsChartData}
                    emptyMessage="Nenhum participante registrado nos ambientes vinculados."
                    variant="info"
                    icon={<UsersGroupIcon aria-hidden className="icon icon--lg" />}
                  />
                </section>

                <section className="organization-charts-grid">
                  <SimpleBarChart
                    title="Status dos ambientes"
                    description="Distribuição dos ambientes do evento conforme o status atual."
                    data={environmentChartData}
                    emptyMessage="Vincule ambientes para acompanhar o status de execução."
                    icon={<ActivityIcon aria-hidden className="icon icon--lg" />}
                  />

                  <div className="card">
                    <div className="section-heading">
                      <span className="section-heading__icon" aria-hidden>
                        <SparklesIcon className="icon icon--lg" />
                      </span>
                      <div>
                        <h3>Resumo executivo</h3>
                        <p className="section-subtitle">
                          Métricas consolidadas em estilo Power BI/Grafana para o evento
                          selecionado.
                        </p>
                      </div>
                    </div>

                    <div className="dashboard-grid">
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
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>

      <Modal isOpen={isEventModalOpen} onClose={handleCloseModal} title="Novo evento">
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <form className="form-grid" onSubmit={handleCreateEvent} data-testid="event-form">
          <TextInput
            id="event-name"
            label="Nome do evento"
            value={eventForm.name}
            onChange={(event) =>
              setEventForm((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />

          <TextArea
            id="event-description"
            label="Descrição"
            value={eventForm.description}
            onChange={(event) =>
              setEventForm((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Contexto, objetivos e metas do evento"
          />

          <TextInput
            id="event-start-date"
            label="Data de início"
            type="date"
            value={eventForm.startDate}
            onChange={(event) =>
              setEventForm((previous) => ({ ...previous, startDate: event.target.value }))
            }
          />

          <TextInput
            id="event-end-date"
            label="Data de fim"
            type="date"
            value={eventForm.endDate}
            onChange={(event) =>
              setEventForm((previous) => ({ ...previous, endDate: event.target.value }))
            }
          />

          <SelectInput
            id="event-environment"
            label="Ambiente inicial (opcional)"
            value={eventForm.environmentId}
            options={
              organizationEnvironments.length > 0
                ? [
                    { value: '', label: 'Nenhum ambiente selecionado' },
                    ...organizationEnvironments.map((environment) => ({
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
            onChange={(event) =>
              setEventForm((previous) => ({ ...previous, environmentId: event.target.value }))
            }
            disabled={organizationEnvironments.length === 0 || isLoadingEnvironments}
          />

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingEvent}>
              {isSavingEvent ? 'Salvando...' : 'Criar evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
