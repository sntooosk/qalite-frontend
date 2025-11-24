import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Environment } from '../../domain/entities/environment';
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
