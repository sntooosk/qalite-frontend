import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Environment, EnvironmentScenarioStatus } from '../../domain/entities/environment';
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
import { SimpleBarChart } from '../components/SimpleBarChart';
import { ActivityIcon, BarChartIcon, SparklesIcon, UsersGroupIcon } from '../components/icons';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const handleOpenEditModal = () => {
    if (!event) return;
    setEventForm({
      name: event.name,
      description: event.description ?? '',
      startDate: event.startDate ?? '',
      endDate: event.endDate ?? '',
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
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
      setIsEditModalOpen(false);
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
      navigate(`/organizations/events?organizationId=${organizationId ?? ''}`);
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

  if (!organizationId || !eventId) {
    return (
      <Layout>
        <section className="page-container">
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Evento não encontrado</h2>
            <p className="section-subtitle">
              Informe uma organização e evento válidos para acessar o dashboard.
            </p>
            <Button type="button" onClick={() => navigate('/organizations/events')}>
              Voltar para eventos
            </Button>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/organizations/events?organizationId=${organizationId}`)}
            >
              Voltar para eventos
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenEditModal}
              disabled={!event}
            >
              Editar evento
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteEvent} disabled={!event}>
              Excluir evento
            </Button>
          </div>
        </div>

        {isLoadingEvent ? (
          <p className="section-subtitle">Carregando evento...</p>
        ) : !event ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Evento não encontrado</h2>
            <p className="section-subtitle">Selecione outro evento na lista da organização.</p>
            <Button
              type="button"
              onClick={() => navigate(`/organizations/events?organizationId=${organizationId}`)}
            >
              Voltar para eventos
            </Button>
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
                    Vincule ou remova ambientes para gerar relatórios precisos do evento.
                  </p>
                </div>
              </div>

              <div className="form-grid">
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
                  Nenhum ambiente vinculado ao evento. Adicione um para acompanhar as métricas.
                </p>
              ) : (
                <ul className="list list--grid">
                  {linkedEnvironments.map((environment) => (
                    <li key={environment.id} className="card card-highlight">
                      <div className="card-header">
                        <div>
                          <p className="badge badge--muted">
                            {renderEnvironmentLabel(environment)}
                          </p>
                          <h3 className="card-title">Status: {environment.status}</h3>
                        </div>
                        <button
                          type="button"
                          className="button button-secondary button-ghost"
                          onClick={() => handleUnlinkEnvironment(environment.id)}
                        >
                          Desvincular
                        </button>
                      </div>
                      <p className="section-subtitle">
                        {Object.keys(environment.scenarios).length} cenário(s) cadastrados
                      </p>
                      <p className="section-subtitle">
                        {environment.participants.length} participante(s) neste ambiente
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-grid">
              <div className="card card-highlight">
                <div className="section-heading">
                  <span className="section-heading__icon" aria-hidden>
                    <BarChartIcon className="icon" />
                  </span>
                  <div>
                    <h3>Distribuição de cenários</h3>
                    <p className="section-subtitle">Situação dos cenários vinculados ao evento.</p>
                  </div>
                </div>

                {totalScenarios === 0 ? (
                  <p className="section-subtitle">
                    Nenhum cenário vinculado aos ambientes do evento.
                  </p>
                ) : (
                  <SimpleBarChart data={scenarioChartData} />
                )}
              </div>

              <div className="card card-highlight">
                <div className="section-heading">
                  <span className="section-heading__icon" aria-hidden>
                    <UsersGroupIcon className="icon" />
                  </span>
                  <div>
                    <h3>Participantes por ambiente</h3>
                    <p className="section-subtitle">
                      Ambientes com maior engajamento de testadores.
                    </p>
                  </div>
                </div>

                {participantsChartData.length === 0 ? (
                  <p className="section-subtitle">
                    Ainda não há participantes nos ambientes vinculados a este evento.
                  </p>
                ) : (
                  <SimpleBarChart data={participantsChartData} />
                )}
              </div>

              <div className="card card-highlight">
                <div className="section-heading">
                  <span className="section-heading__icon" aria-hidden>
                    <ActivityIcon className="icon" />
                  </span>
                  <div>
                    <h3>Status dos ambientes</h3>
                    <p className="section-subtitle">Visão geral do andamento das execuções.</p>
                  </div>
                </div>

                {environmentChartData.length === 0 ? (
                  <p className="section-subtitle">Nenhum ambiente vinculado ao evento.</p>
                ) : (
                  <SimpleBarChart data={environmentChartData} />
                )}
              </div>
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
            </section>
          </>
        )}
      </section>

      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Editar evento">
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
            <Button type="button" variant="secondary" onClick={handleCloseEditModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingEvent}>
              {isSavingEvent ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
