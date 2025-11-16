import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
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
import { SelectInput } from '../components/SelectInput';
import {
  AUTOMATION_OPTIONS,
  CRITICALITY_OPTIONS,
  getCriticalityClassName,
} from '../constants/scenarioOptions';

const emptyScenarioForm: StoreScenarioInput = {
  title: '',
  category: '',
  automation: '',
  criticality: '',
  observation: '',
  bdd: '',
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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isScenarioTableCollapsed, setIsScenarioTableCollapsed] = useState(false);

  const canManageScenarios = Boolean(user);

  const scenarioCategories = useMemo(
    () =>
      new Set(
        scenarios
          .map((scenario) => scenario.category.trim())
          .filter((category) => category.length > 0),
      ),
    [scenarios],
  );

  const availableCategories = useMemo(() => {
    const fromScenarios = Array.from(scenarioCategories);
    const combined = new Set([...fromScenarios, ...customCategories]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [customCategories, scenarioCategories]);

  const categorySelectOptions = useMemo(() => {
    if (availableCategories.length === 0) {
      return [{ value: '', label: 'Cadastre uma categoria para começar' }];
    }

    return [
      { value: '', label: 'Selecione uma categoria' },
      ...availableCategories.map((category) => ({ value: category, label: category })),
    ];
  }, [availableCategories]);

  const automationSelectOptions = useMemo(
    () => [{ value: '', label: 'Selecione o tipo de automação' }, ...AUTOMATION_OPTIONS],
    [],
  );

  const criticalitySelectOptions = useMemo(
    () => [{ value: '', label: 'Selecione a criticidade' }, ...CRITICALITY_OPTIONS],
    [],
  );

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
          storeService.listScenarios(data.id),
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

  useEffect(() => {
    if (scenarios.length === 0) {
      setIsScenarioTableCollapsed(false);
    }
  }, [scenarios.length]);

  useEffect(() => {
    setCustomCategories([]);
    setNewCategoryName('');
    setCategoryError(null);
  }, [storeId]);

  const handleScenarioFormChange =
    (field: keyof StoreScenarioInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setScenarioForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryName.trim();
    if (!trimmedCategory) {
      setCategoryError('Informe o nome da nova categoria.');
      return;
    }

    const alreadyExists = availableCategories.some(
      (category) => category.toLowerCase() === trimmedCategory.toLowerCase(),
    );

    if (alreadyExists) {
      setCategoryError('Esta categoria já está disponível.');
      setScenarioForm((previous) => ({ ...previous, category: trimmedCategory }));
      return;
    }

    setCustomCategories((previous) => [...previous, trimmedCategory]);
    setScenarioForm((previous) => ({ ...previous, category: trimmedCategory }));
    setNewCategoryName('');
    setCategoryError(null);
  };

  const handleRemoveCustomCategory = (category: string) => {
    setCustomCategories((previous) => previous.filter((item) => item !== category));
    if (scenarioForm.category === category) {
      setScenarioForm((previous) => ({ ...previous, category: '' }));
    }
  };

  const handleCopyBdd = async (bdd: string) => {
    if (!bdd.trim()) {
      showToast({ type: 'error', message: 'Não há conteúdo de BDD para copiar.' });
      return;
    }

    try {
      if (!navigator?.clipboard) {
        throw new Error('Clipboard API indisponível.');
      }
      await navigator.clipboard.writeText(bdd);
      showToast({ type: 'success', message: 'BDD copiado para a área de transferência.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível copiar o BDD automaticamente.' });
    }
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
      bdd: scenarioForm.bdd.trim(),
    };

    const hasEmptyField = Object.values(trimmedScenario).some((value) => value === '');
    if (hasEmptyField) {
      setScenarioFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSavingScenario(true);
      if (editingScenarioId) {
        const updated = await storeService.updateScenario(
          store.id,
          editingScenarioId,
          trimmedScenario,
        );
        setScenarios((previous) =>
          previous.map((scenario) => (scenario.id === updated.id ? updated : scenario)),
        );
        showToast({ type: 'success', message: 'Cenário atualizado com sucesso.' });
      } else {
        const created = await storeService.createScenario({
          storeId: store.id,
          ...trimmedScenario,
        });
        setScenarios((previous) => [...previous, created]);
        setStore((previous) =>
          previous ? { ...previous, scenarioCount: previous.scenarioCount + 1 } : previous,
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
      bdd: scenario.bdd,
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
        previous
          ? { ...previous, scenarioCount: Math.max(previous.scenarioCount - 1, 0) }
          : previous,
      );

      if (editingScenarioId === scenario.id) {
        handleCancelScenarioEdit();
      }

      showToast({ type: 'success', message: 'Cenário removido com sucesso.' });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível remover o cenário.';
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
            <h1 className="section-title">
              {isLoadingStore ? 'Carregando loja...' : (store?.name ?? 'Loja')}
            </h1>
            {store && (
              <p className="section-subtitle">
                {organization?.name ? `${organization.name} • ` : ''}
                {store.site || 'Site não informado'}
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
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </span>
                </div>
              </div>

              {store && canManageScenarios && (
                <form className="scenario-form" onSubmit={handleScenarioSubmit}>
                  <h3 className="form-title">
                    {editingScenarioId ? 'Editar cenário' : 'Novo cenário'}
                  </h3>
                  {scenarioFormError && (
                    <p className="form-message form-message--error">{scenarioFormError}</p>
                  )}
                  <TextInput
                    id="scenario-title"
                    label="Título"
                    value={scenarioForm.title}
                    onChange={handleScenarioFormChange('title')}
                    required
                  />
                  <div className="scenario-form-grid">
                    <SelectInput
                      id="scenario-category"
                      label="Categoria"
                      value={scenarioForm.category}
                      onChange={handleScenarioFormChange('category')}
                      options={categorySelectOptions}
                      required
                    />
                    <SelectInput
                      id="scenario-automation"
                      label="Automação"
                      value={scenarioForm.automation}
                      onChange={handleScenarioFormChange('automation')}
                      options={automationSelectOptions}
                      required
                    />
                    <SelectInput
                      id="scenario-criticality"
                      label="Criticidade"
                      value={scenarioForm.criticality}
                      onChange={handleScenarioFormChange('criticality')}
                      options={criticalitySelectOptions}
                      required
                    />
                  </div>
                  <div className="category-manager">
                    <div className="category-manager-header">
                      <p className="field-label">Categorias disponíveis</p>
                      <p className="category-manager-description">
                        Utilize as categorias cadastradas anteriormente ou crie novas opções para
                        manter a massa organizada.
                      </p>
                    </div>
                    <div className="category-manager-actions">
                      <input
                        type="text"
                        className="field-input"
                        placeholder="Informe uma nova categoria"
                        value={newCategoryName}
                        onChange={(event) => {
                          setNewCategoryName(event.target.value);
                          setCategoryError(null);
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={handleAddCategory}>
                        Adicionar categoria
                      </Button>
                    </div>
                    {categoryError && (
                      <p className="form-message form-message--error">{categoryError}</p>
                    )}
                    {availableCategories.length > 0 ? (
                      <ul className="category-chip-list">
                        {availableCategories.map((category) => (
                          <li key={category} className="category-chip">
                            <span>{category}</span>
                            {!scenarioCategories.has(category) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomCategory(category)}
                                className="category-chip-remove"
                                aria-label={`Remover categoria ${category}`}
                              >
                                &times;
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="category-manager-empty">Nenhuma categoria cadastrada ainda.</p>
                    )}
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

              <div className="scenario-table-header">
                <h3 className="section-subtitle">Massa de cenários</h3>
                {scenarios.length > 0 && (
                  <button
                    type="button"
                    className="scenario-table-toggle"
                    onClick={() => setIsScenarioTableCollapsed((previous) => !previous)}
                  >
                    {isScenarioTableCollapsed ? 'Maximizar tabela' : 'Minimizar tabela'}
                  </button>
                )}
              </div>
              <div className="scenario-table-wrapper">
                {isScenarioTableCollapsed ? (
                  <p className="section-subtitle">
                    Tabela minimizada. Utilize o botão acima para visualizar os cenários novamente.
                  </p>
                ) : isLoadingScenarios ? (
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
                          <td>
                            <span
                              className={`criticality-badge ${getCriticalityClassName(scenario.criticality)}`}
                            >
                              {scenario.criticality}
                            </span>
                          </td>
                          <td className="scenario-observation">{scenario.observation}</td>
                          <td className="scenario-bdd">
                            <button
                              type="button"
                              className="scenario-copy-button"
                              onClick={() => void handleCopyBdd(scenario.bdd)}
                            >
                              Copiar BDD
                            </button>
                          </td>
                          {canManageScenarios && (
                            <td className="scenario-actions">
                              <button
                                type="button"
                                onClick={() => handleEditScenario(scenario)}
                                disabled={isSavingScenario}
                              >
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
