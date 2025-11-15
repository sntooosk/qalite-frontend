import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type { Store, StoreScenario, StoreScenarioInput } from '../../domain/entities/Store';
import { organizationService } from '../../application/services/OrganizationService';
import { storeService } from '../../application/services/StoreService';
import { useAuth } from '../../application/hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';

const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: ''
};

export const StoreSummaryPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();

  const [store, setStore] = useState<Store | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [scenarioForm, setScenarioForm] = useState<StoreScenarioInput>(emptyScenarioForm);
  const [scenarioFormError, setScenarioFormError] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);

  const canManageScenarios = Boolean(user);

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

    const fetchData = async () => {
      try {
        setIsLoadingStore(true);
        setIsLoadingScenarios(true);

        const data = await storeService.getById(storeId);

        if (!data) {
          showToast({ type: 'error', message: 'Loja não encontrada.' });
          navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
          return;
        }

        if (user.role !== 'admin' && user.organizationId !== data.organizationId) {
          showToast({ type: 'error', message: 'Você não tem permissão para acessar esta loja.' });
          navigate('/dashboard', { replace: true });
          return;
        }

        setStore(data);

        const [organizationData, scenariosData] = await Promise.all([
          organizationService.getById(data.organizationId),
          storeService.listScenarios(data.id)
        ]);

        if (organizationData) {
          setOrganization(organizationData);
        }
        setScenarios(scenariosData);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar os detalhes da loja.' });
      } finally {
        setIsLoadingStore(false);
        setIsLoadingScenarios(false);
      }
    };

    void fetchData();
  }, [isInitializing, navigate, showToast, storeId, user]);

  const handleScenarioFormChange = (field: keyof StoreScenarioInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setScenarioForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleCancelScenarioEdit = () => {
    setScenarioForm(emptyScenarioForm);
    setEditingScenarioId(null);
    setScenarioFormError(null);
  };

  const handleScenarioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScenarioFormError(null);

    if (!store || !canManageScenarios) {
      return;
    }

    const trimmedScenario: StoreScenarioInput = {
      title: scenarioForm.title.trim(),
      category: scenarioForm.category.trim(),
      automation: scenarioForm.automation.trim(),
      criticality: scenarioForm.criticality.trim(),
      observation: scenarioForm.observation.trim(),
      bdd: scenarioForm.bdd.trim()
    };

    const hasEmptyField = Object.values(trimmedScenario).some((value) => value === '');
    if (hasEmptyField) {
      setScenarioFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSavingScenario(true);
      if (editingScenarioId) {
        const updated = await storeService.updateScenario(store.id, editingScenarioId, trimmedScenario);
        setScenarios((previous) => previous.map((scenario) => (scenario.id === updated.id ? updated : scenario)));
        showToast({ type: 'success', message: 'Cenário atualizado com sucesso.' });
      } else {
        const created = await storeService.createScenario({ storeId: store.id, ...trimmedScenario });
        setScenarios((previous) => [...previous, created]);
        setStore((previous) =>
          previous ? { ...previous, scenarioCount: previous.scenarioCount + 1 } : previous
        );
        showToast({ type: 'success', message: 'Cenário adicionado com sucesso.' });
      }

      handleCancelScenarioEdit();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o cenário.';
      setScenarioFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleEditScenario = (scenario: StoreScenario) => {
    if (!canManageScenarios) {
      return;
    }

    setScenarioForm({
      title: scenario.title,
      category: scenario.category,
      automation: scenario.automation,
      criticality: scenario.criticality,
      observation: scenario.observation,
      bdd: scenario.bdd
    });
    setEditingScenarioId(scenario.id);
    setScenarioFormError(null);
  };

  const handleDeleteScenario = async (scenario: StoreScenario) => {
    if (!store || !canManageScenarios) {
      return;
    }

    const confirmation = window.confirm(`Deseja remover o cenário "${scenario.title}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setIsSavingScenario(true);
      await storeService.deleteScenario(store.id, scenario.id);
      setScenarios((previous) => previous.filter((item) => item.id !== scenario.id));
      setStore((previous) =>
        previous ? { ...previous, scenarioCount: Math.max(previous.scenarioCount - 1, 0) } : previous
      );

      if (editingScenarioId === scenario.id) {
        handleCancelScenarioEdit();
      }

      showToast({ type: 'success', message: 'Cenário removido com sucesso.' });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Não foi possível remover o cenário.';
      showToast({ type: 'error', message });
    } finally {
      setIsSavingScenario(false);
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
            >
              &larr; Voltar
            </button>
            <h1 className="section-title">{isLoadingStore ? 'Carregando loja...' : store?.name ?? 'Loja'}</h1>
            {store && (
              <p className="section-subtitle">
                {organization?.name ? `${organization.name} • ` : ''}
                {store.site ? `${store.site} • ` : ''}
                {store.stage || 'Ambiente não informado'}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          {isLoadingStore ? (
            <p className="section-subtitle">Sincronizando dados da loja...</p>
          ) : !store ? (
            <p className="section-subtitle">Não foi possível encontrar os detalhes desta loja.</p>
          ) : (
            <div className="store-summary">
              <div className="store-summary-meta">
                <div>
                  <span className="badge">Resumo</span>
                  <h2 className="text-xl font-semibold text-primary">Informações gerais</h2>
                </div>
                <div className="store-summary-stats">
                  <span>
                    <strong>Cenários:</strong> {scenarios.length}
                  </span>
                  <span>
                    <strong>Ambiente:</strong> {store.stage || 'Não informado'}
                  </span>
                  <span>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                </div>
              </div>

              {store && canManageScenarios && (
                <form className="scenario-form" onSubmit={handleScenarioSubmit}>
                  <h3 className="form-title">{editingScenarioId ? 'Editar cenário' : 'Novo cenário'}</h3>
                  {scenarioFormError && <p className="form-message form-message--error">{scenarioFormError}</p>}
                  <TextInput
                    id="scenario-title"
                    label="Título"
                    value={scenarioForm.title}
                    onChange={handleScenarioFormChange('title')}
                    required
                  />
                  <div className="scenario-form-grid">
                    <TextInput
                      id="scenario-category"
                      label="Categoria"
                      value={scenarioForm.category}
                      onChange={handleScenarioFormChange('category')}
                      required
                    />
                    <TextInput
                      id="scenario-automation"
                      label="Automação"
                      value={scenarioForm.automation}
                      onChange={handleScenarioFormChange('automation')}
                      required
                    />
                    <TextInput
                      id="scenario-criticality"
                      label="Criticidade"
                      value={scenarioForm.criticality}
                      onChange={handleScenarioFormChange('criticality')}
                      required
                    />
                  </div>
                  <TextArea
                    id="scenario-observation"
                    label="Observação"
                    value={scenarioForm.observation}
                    onChange={handleScenarioFormChange('observation')}
                    required
                  />
                  <TextArea
                    id="scenario-bdd"
                    label="BDD"
                    value={scenarioForm.bdd}
                    onChange={handleScenarioFormChange('bdd')}
                    required
                  />
                  <div className="scenario-form-actions">
                    <Button type="submit" isLoading={isSavingScenario} loadingText="Salvando...">
                      {editingScenarioId ? 'Atualizar cenário' : 'Adicionar cenário'}
                    </Button>
                    {editingScenarioId && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelScenarioEdit}
                        disabled={isSavingScenario}
                      >
                        Cancelar edição
                      </Button>
                    )}
                  </div>
                </form>
              )}

              <div className="scenario-table-wrapper">
                {isLoadingScenarios ? (
                  <p className="section-subtitle">Carregando massa de cenários...</p>
                ) : scenarios.length === 0 ? (
                  <p className="section-subtitle">
                    {canManageScenarios
                      ? 'Nenhum cenário cadastrado para esta loja ainda. Utilize o formulário acima para criar o primeiro.'
                      : 'Nenhum cenário cadastrado para esta loja ainda. Solicite a um responsável a criação da massa de testes.'}
                  </p>
                ) : (
                  <table className="scenario-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Categoria</th>
                        <th>Automação</th>
                        <th>Criticidade</th>
                        <th>Observação</th>
                        <th>BDD</th>
                        {canManageScenarios && <th>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((scenario) => (
                        <tr key={scenario.id}>
                          <td>{scenario.title}</td>
                          <td>{scenario.category}</td>
                          <td>{scenario.automation}</td>
                          <td>{scenario.criticality}</td>
                          <td className="scenario-observation">{scenario.observation}</td>
                          <td className="scenario-bdd">{scenario.bdd}</td>
                          {canManageScenarios && (
                            <td className="scenario-actions">
                              <button type="button" onClick={() => handleEditScenario(scenario)} disabled={isSavingScenario}>
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteScenario(scenario)}
                                disabled={isSavingScenario}
                                className="scenario-delete"
                              >
                                Excluir
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};
