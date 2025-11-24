import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import type { OrganizationEvent } from '../../domain/entities/event';
import type { Store } from '../../domain/entities/store';
import type { Environment } from '../../domain/entities/environment';
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
import { ActivityIcon } from '../components/icons';

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

export const OrganizationEventsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [events, setEvents] = useState<OrganizationEvent[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(initialEventForm);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const organizationEnvironments = useMemo(
    () => environments.filter((environment) => environment.storeId in storeNameMap),
    [environments, storeNameMap],
  );

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
      handleCloseModal();
      showToast({ type: 'success', message: 'Evento criado com sucesso.' });
      navigate(`/event?organizationId=${selectedOrganizationId}&eventId=${created.id}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível criar o evento.';
      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const renderEnvironmentLabel = (environment: Environment) => {
    const storeName = storeNameMap[environment.storeId] ?? 'Loja não encontrada';
    return `${environment.identificador} (${storeName})`;
  };

  return (
    <Layout>
      <section className="page-container" data-testid="organization-events-page">
        <div className="page-header">
          <div>
            <h1 className="section-title">Eventos da organização</h1>
            <p className="section-subtitle">
              Acesse e crie eventos exclusivos para cada organização.
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
              Criar novo evento
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
                Os eventos exibidos abaixo são exclusivos da organização escolhida.
              </p>
            </div>
          </div>
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
              Criar novo evento
            </Button>
          </div>
        ) : (
          <div
            className="card organization-log-panel organization-log-panel--collapsed"
            role="region"
            aria-label="Eventos da organização"
          >
            <div className="organization-log-panel__header">
              <div className="organization-log-panel__heading">
                <span className="icon-pill" aria-hidden>
                  <ActivityIcon className="icon" />
                </span>
                <div>
                  <div className="organization-log-panel__title-row">
                    <span className="badge">Eventos</span>
                    <span className="badge badge--muted">
                      {isLoadingEvents
                        ? 'Carregando...'
                        : `${events.length} evento${events.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-primary">Lista de eventos</h2>
                  <p className="section-subtitle">
                    Clique em um evento para editar, excluir e visualizar a dashboard dedicada.
                  </p>
                </div>
              </div>

              <Button type="button" onClick={handleOpenCreateModal} data-testid="new-event-button">
                Criar novo evento
              </Button>
            </div>

            <div className="organization-log-panel__list">
              {events.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="organization-log-panel__row"
                  onClick={() =>
                    navigate(`/event?organizationId=${selectedOrganizationId}&eventId=${item.id}`)
                  }
                >
                  <div className="organization-log-panel__row-content">
                    <div>
                      <p className="badge badge--muted">
                        {item.startDate ? `Início: ${item.startDate}` : 'Início não definido'}
                      </p>
                      <h3 className="card-title">{item.name}</h3>
                      <p className="section-subtitle">{item.description || 'Sem descrição'}</p>
                    </div>
                    <div className="organization-log-panel__row-meta">
                      <span className="badge">{item.environmentIds.length} ambiente(s)</span>
                      <span className="badge badge--muted">
                        {item.endDate ? `Fim: ${item.endDate}` : 'Fim não definido'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
