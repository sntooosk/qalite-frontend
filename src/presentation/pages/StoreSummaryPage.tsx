import { useNavigate } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { TextArea } from '../components/TextArea';
import { SelectInput } from '../components/SelectInput';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/PageLoader';
import { getCriticalityClassName } from '../constants/scenarioOptions';
import { EnvironmentKanban } from '../components/environments/EnvironmentKanban';
import { ScenarioColumnSortControl } from '../components/ScenarioColumnSortControl';
import { useStoreSummaryViewModel } from '../features/store-summary/useStoreSummaryViewModel';

export const StoreSummaryPage = () => {
  const navigate = useNavigate();
  const {
    storeId,
    user,
    isPreparingStoreView,
    store,
    organization,
    scenarios,
    suites,
    isLoadingStore,
    isLoadingScenarios,
    isLoadingSuites,
    isLoadingCategories,
    isSyncingLegacyCategories,
    viewMode,
    setViewMode,
    canManageScenarios,
    canManageStoreSettings,
    canToggleCategoryList,
    storeSiteInfo,
    scenarioForm,
    scenarioFormError,
    editingScenarioId,
    isSavingScenario,
    scenarioSort,
    setScenarioSort,
    scenarioFilters,
    handleScenarioFilterChange,
    handleClearScenarioFilters,
    categoryFilterOptions,
    criticalityFilterOptions,
    orderedFilteredScenarios,
    isScenarioTableCollapsed,
    setIsScenarioTableCollapsed,
    handleScenarioSubmit,
    handleScenarioFormChange,
    handleCancelScenarioEdit,
    handleEditScenario,
    handleDeleteScenario,
    handleCopyBdd,
    categorySelectOptions,
    automationSelectOptions,
    criticalitySelectOptions,
    newCategoryName,
    setNewCategoryName,
    categoryError,
    categories,
    scenarioCategories,
    isCategoryListCollapsed,
    setIsCategoryListCollapsed,
    isCreatingCategory,
    handleCreateCategory,
    editingCategoryId,
    editingCategoryName,
    handleStartEditCategory,
    handleUpdateCategory,
    handleCancelEditCategory,
    handleDeleteCategory,
    deletingCategoryId,
    updatingCategoryId,
    storeSettings,
    setStoreSettings,
    storeSettingsError,
    isStoreSettingsOpen,
    openStoreSettings,
    closeStoreSettings,
    handleStoreSettingsSubmit,
    isUpdatingStore,
    handleRemoveStore,
    isDeletingStore,
    suiteForm,
    suiteFormError,
    editingSuiteId,
    isSavingSuite,
    handleSuiteFormChange,
    handleSuiteScenarioToggle,
    handleCancelSuiteEdit,
    handleEditSuite,
    handleDeleteSuite,
    suiteSelectionSummary,
    suiteScenarioFilters,
    handleSuiteScenarioFilterChange,
    handleClearSuiteScenarioFilters,
    suiteScenarioSort,
    setSuiteScenarioSort,
    orderedSuiteScenarios,
    handleSuiteSubmit,
    isViewingSuitesOnly,
    handleShowSuitesOnly,
    handleBackToSuiteForm,
    suiteListRef,
    selectedSuitePreviewId,
    setSelectedSuitePreviewId,
    selectedSuitePreview,
    orderedSuitePreviewEntries,
    suitePreviewSort,
    setSuitePreviewSort,
  } = useStoreSummaryViewModel();

  if (isPreparingStoreView) {
    return (
      <Layout>
        <section className="page-container">
          <PageLoader message="Carregando loja..." />
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              >
                ← Voltar
              </Button>
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
            {store && canManageStoreSettings && (
              <div className="store-summary__actions">
                <Button type="button" variant="secondary" onClick={openStoreSettings}>
                  Configurações da loja
                </Button>
              </div>
            )}
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
                      <strong>Site:</strong>{' '}
                      {storeSiteInfo.href ? (
                        <a href={storeSiteInfo.href} target="_blank" rel="noreferrer noopener">
                          {storeSiteInfo.label}
                        </a>
                      ) : (
                        storeSiteInfo.label
                      )}
                    </span>
                  </div>
                </div>

                <div className="scenario-view-toggle" aria-label="Alternar visualização">
                  <span>Visualizar</span>
                  <div className="scenario-view-toggle-buttons">
                    <button
                      type="button"
                      className={viewMode === 'scenarios' ? 'is-active' : ''}
                      onClick={() => setViewMode('scenarios')}
                    >
                      Massa de cenários
                    </button>
                    <button
                      type="button"
                      className={viewMode === 'suites' ? 'is-active' : ''}
                      onClick={() => setViewMode('suites')}
                    >
                      Suítes de testes
                    </button>
                  </div>
                </div>

                {store && canManageScenarios && viewMode === 'scenarios' && (
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
                        <div className="category-manager-header-text">
                          <p className="field-label">Categorias disponíveis</p>
                          <p className="category-manager-description">
                            Cadastre, edite ou remova as categorias utilizadas para organizar a
                            massa de cenários. Uma categoria só pode ser removida se não estiver
                            associada a nenhum cenário.
                          </p>
                        </div>
                        {canToggleCategoryList && (
                          <button
                            type="button"
                            className="category-manager-toggle"
                            onClick={() =>
                              setIsCategoryListCollapsed((previousState) => !previousState)
                            }
                            aria-expanded={!isCategoryListCollapsed}
                          >
                            {isCategoryListCollapsed ? 'Maximizar lista' : 'Minimizar lista'}
                          </button>
                        )}
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
                          disabled={!store}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCreateCategory}
                          isLoading={isCreatingCategory}
                          loadingText="Salvando..."
                          disabled={!store || isLoadingCategories || isSyncingLegacyCategories}
                        >
                          Adicionar categoria
                        </Button>
                      </div>
                      {categoryError && (
                        <p className="form-message form-message--error">{categoryError}</p>
                      )}
                      {isLoadingCategories || isSyncingLegacyCategories ? (
                        <p className="category-manager-description">Carregando categorias...</p>
                      ) : isCategoryListCollapsed && categories.length > 0 ? (
                        <p className="category-manager-description category-manager-collapsed-message">
                          Lista minimizada. Utilize o botão acima para visualizar novamente.
                        </p>
                      ) : categories.length > 0 ? (
                        <ul className="category-manager-list">
                          {categories.map((category) => {
                            const isEditingCategory = editingCategoryId === category.id;
                            const isCategoryUsed = scenarioCategories.has(category.name);
                            return (
                              <li key={category.id} className="category-manager-item">
                                {isEditingCategory ? (
                                  <>
                                    <input
                                      type="text"
                                      className="field-input"
                                      value={editingCategoryName}
                                      onChange={(event) => {
                                        setEditingCategoryName(event.target.value);
                                        setCategoryError(null);
                                      }}
                                    />
                                    <div className="category-manager-item-actions">
                                      <Button
                                        type="button"
                                        onClick={handleUpdateCategory}
                                        isLoading={updatingCategoryId === category.id}
                                        loadingText="Salvando..."
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleCancelEditCategory}
                                        disabled={updatingCategoryId === category.id}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="category-manager-item-name">
                                      {category.name}
                                    </span>
                                    <div className="category-manager-item-actions">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleStartEditCategory(category)}
                                        disabled={deletingCategoryId === category.id}
                                      >
                                        Editar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handleDeleteCategory(category)}
                                        disabled={
                                          deletingCategoryId === category.id || isCategoryUsed
                                        }
                                        isLoading={deletingCategoryId === category.id}
                                        loadingText="Removendo..."
                                        title={
                                          isCategoryUsed
                                            ? 'Remova ou atualize os cenários associados antes de excluir.'
                                            : undefined
                                        }
                                      >
                                        Remover
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="category-manager-empty">
                          Nenhuma categoria cadastrada ainda.
                        </p>
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
                  <div>
                    <h3 className="section-subtitle">Massa de cenários e suítes de testes</h3>
                  </div>
                  {viewMode === 'scenarios' && scenarios.length > 0 && (
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
                  {viewMode === 'scenarios' ? (
                    isScenarioTableCollapsed ? (
                      <p className="section-subtitle">
                        Tabela minimizada. Utilize o botão acima para visualizar os cenários
                        novamente.
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
                      <>
                        <div className="scenario-filter-bar">
                          <input
                            type="text"
                            className="scenario-filter-input"
                            placeholder="Busque pelo título do cenário"
                            value={scenarioFilters.search}
                            onChange={handleScenarioFilterChange('search')}
                            aria-label="Buscar cenários por título"
                          />
                          <select
                            className="scenario-filter-input"
                            value={scenarioFilters.category}
                            onChange={handleScenarioFilterChange('category')}
                            aria-label="Filtrar por categoria"
                          >
                            {categoryFilterOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="scenario-filter-input"
                            value={scenarioFilters.criticality}
                            onChange={handleScenarioFilterChange('criticality')}
                            aria-label="Filtrar por criticidade"
                          >
                            {criticalityFilterOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {(scenarioFilters.search ||
                            scenarioFilters.category ||
                            scenarioFilters.criticality) && (
                            <button
                              type="button"
                              className="scenario-filter-clear"
                              onClick={handleClearScenarioFilters}
                            >
                              Limpar filtros
                            </button>
                          )}
                        </div>
                        {filteredScenarios.length === 0 ? (
                          <p className="section-subtitle">
                            Nenhum cenário corresponde aos filtros aplicados.
                          </p>
                        ) : (
                          <table className="scenario-table data-table">
                            <thead>
                              <tr>
                                <th>Título</th>
                                <th>
                                  <ScenarioColumnSortControl
                                    label="Categoria"
                                    field="category"
                                    sort={scenarioSort}
                                    onChange={setScenarioSort}
                                  />
                                </th>
                                <th>
                                  <ScenarioColumnSortControl
                                    label="Automação"
                                    field="automation"
                                    sort={scenarioSort}
                                    onChange={setScenarioSort}
                                  />
                                </th>
                                <th>
                                  <ScenarioColumnSortControl
                                    label="Criticidade"
                                    field="criticality"
                                    sort={scenarioSort}
                                    onChange={setScenarioSort}
                                  />
                                </th>
                                <th>Observação</th>
                                <th>BDD</th>
                                {canManageScenarios && <th>Ações</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {orderedFilteredScenarios.map((scenario) => (
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
                      </>
                    )
                  ) : (
                    <div
                      ref={suiteListRef}
                      className={`suite-manager ${isViewingSuitesOnly ? 'suite-manager--suites-only' : ''}`}
                    >
                      {isViewingSuitesOnly ? (
                        <div className="suite-cards-view">
                          <div className="suite-table-header">
                            <span className="suite-preview-title">Suítes cadastradas</span>
                            <Button type="button" variant="ghost" onClick={handleBackToSuiteForm}>
                              Voltar para formulário
                            </Button>
                          </div>
                          {isLoadingSuites ? (
                            <p className="section-subtitle">Carregando suítes de testes...</p>
                          ) : suites.length === 0 ? (
                            <p className="section-subtitle">
                              Nenhuma suíte cadastrada ainda. Utilize o formulário para criar sua
                              primeira seleção.
                            </p>
                          ) : (
                            <div className="suite-cards-grid">
                              {suites
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((suite) => {
                                  const isActive = selectedSuitePreviewId === suite.id;
                                  return (
                                    <button
                                      key={suite.id}
                                      type="button"
                                      className={`suite-card-trigger ${isActive ? 'is-active' : ''}`}
                                      onClick={() =>
                                        setSelectedSuitePreviewId((previous) =>
                                          previous === suite.id ? null : suite.id,
                                        )
                                      }
                                    >
                                      <span className="suite-card-trigger__title">
                                        {suite.name}
                                      </span>
                                      <span className="suite-card-trigger__count">
                                        {suite.scenarioIds.length} cenário
                                        {suite.scenarioIds.length === 1 ? '' : 's'}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          {!selectedSuitePreview ? (
                            <p className="section-subtitle">
                              Clique em um card para visualizar os cenários associados.
                            </p>
                          ) : orderedSuitePreviewEntries.length === 0 ? (
                            <p className="section-subtitle">
                              Esta suíte não possui cenários cadastrados ou alguns itens foram
                              removidos.
                            </p>
                          ) : (
                            <div className="suite-preview suite-preview--cards">
                              <table className="suite-preview-table data-table">
                                <thead>
                                  <tr>
                                    <th>Cenário</th>
                                    <th>
                                      <ScenarioColumnSortControl
                                        label="Categoria"
                                        field="category"
                                        sort={suitePreviewSort}
                                        onChange={setSuitePreviewSort}
                                      />
                                    </th>
                                    <th>
                                      <ScenarioColumnSortControl
                                        label="Automação"
                                        field="automation"
                                        sort={suitePreviewSort}
                                        onChange={setSuitePreviewSort}
                                      />
                                    </th>
                                    <th>
                                      <ScenarioColumnSortControl
                                        label="Criticidade"
                                        field="criticality"
                                        sort={suitePreviewSort}
                                        onChange={setSuitePreviewSort}
                                      />
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderedSuitePreviewEntries.map(({ scenarioId, scenario }) => (
                                    <tr key={`${selectedSuitePreview.id}-${scenarioId}`}>
                                      <td>{scenario?.title ?? 'Cenário removido'}</td>
                                      <td>{scenario?.category ?? 'N/A'}</td>
                                      <td>{scenario?.automation ?? '-'}</td>
                                      <td>{scenario?.criticality ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {selectedSuitePreview && canManageScenarios && (
                            <div className="suite-preview-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleEditSuite(selectedSuitePreview)}
                                disabled={isSavingSuite}
                                className="suite-edit"
                              >
                                Editar suíte
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => void handleDeleteSuite(selectedSuitePreview)}
                                disabled={isSavingSuite}
                                className="suite-delete"
                              >
                                Excluir suíte
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="suite-form">
                            <form
                              className="card suite-card suite-editor-card"
                              onSubmit={handleSuiteSubmit}
                            >
                              <div className="suite-form-header-actions suite-editor-actions">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={handleShowSuitesOnly}
                                >
                                  Ir para cadastradas
                                </Button>
                                {editingSuiteId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancelSuiteEdit}
                                    disabled={isSavingSuite}
                                  >
                                    Cancelar edição
                                  </Button>
                                )}
                              </div>
                              <div className="suite-form-header">
                                <div>
                                  <h3 className="form-title">
                                    {editingSuiteId
                                      ? 'Editar suíte de testes'
                                      : 'Nova suíte de testes'}
                                  </h3>
                                </div>
                              </div>
                              {suiteFormError && (
                                <p className="form-message form-message--error">{suiteFormError}</p>
                              )}
                              <div className="suite-basic-info">
                                <TextInput
                                  id="suite-name"
                                  label="Nome da suíte"
                                  value={suiteForm.name}
                                  onChange={handleSuiteFormChange('name')}
                                  required
                                />
                                <TextArea
                                  id="suite-description"
                                  label="Descrição"
                                  value={suiteForm.description}
                                  onChange={handleSuiteFormChange('description')}
                                  required
                                />
                              </div>
                              <div className="suite-scenario-selector">
                                <div className="suite-scenario-selector-header">
                                  <p className="field-label">Seleção de cenários</p>
                                  {scenarios.length === 0 && (
                                    <p className="suite-scenario-selector-description">
                                      Cadastre cenários na seção acima para começar a criar suítes.
                                    </p>
                                  )}
                                </div>
                                <p className="suite-selection-summary">{suiteSelectionSummary}</p>
                                {scenarios.length === 0 ? (
                                  <p className="category-manager-empty">
                                    Nenhum cenário disponível para seleção no momento.
                                  </p>
                                ) : (
                                  <>
                                    <div className="scenario-filter-bar suite-scenario-filters">
                                      <input
                                        type="text"
                                        className="scenario-filter-input"
                                        placeholder="Busque pelo título do cenário"
                                        value={suiteScenarioFilters.search}
                                        onChange={handleSuiteScenarioFilterChange('search')}
                                        aria-label="Buscar cenários por título"
                                      />
                                      <select
                                        className="scenario-filter-input"
                                        value={suiteScenarioFilters.category}
                                        onChange={handleSuiteScenarioFilterChange('category')}
                                        aria-label="Filtrar por categoria"
                                      >
                                        {categoryFilterOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="scenario-filter-input"
                                        value={suiteScenarioFilters.criticality}
                                        onChange={handleSuiteScenarioFilterChange('criticality')}
                                        aria-label="Filtrar por criticidade"
                                      >
                                        {criticalityFilterOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      {(suiteScenarioFilters.search ||
                                        suiteScenarioFilters.category ||
                                        suiteScenarioFilters.criticality) && (
                                        <button
                                          type="button"
                                          className="scenario-filter-clear"
                                          onClick={handleClearSuiteScenarioFilters}
                                        >
                                          Limpar filtros
                                        </button>
                                      )}
                                    </div>
                                    {filteredSuiteScenarios.length === 0 ? (
                                      <p className="category-manager-empty">
                                        Nenhum cenário corresponde aos filtros aplicados.
                                      </p>
                                    ) : (
                                      <div className="suite-scenario-table-wrapper">
                                        <table className="scenario-table suite-scenario-table data-table">
                                          <thead>
                                            <tr>
                                              <th className="suite-scenario-checkbox">
                                                Selecionar
                                              </th>
                                              <th>Título</th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Categoria"
                                                  field="category"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Automação"
                                                  field="automation"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>
                                                <ScenarioColumnSortControl
                                                  label="Criticidade"
                                                  field="criticality"
                                                  sort={suiteScenarioSort}
                                                  onChange={setSuiteScenarioSort}
                                                />
                                              </th>
                                              <th>Observação</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {orderedSuiteScenarios.map((scenario) => {
                                              const isSelected = suiteForm.scenarioIds.includes(
                                                scenario.id,
                                              );
                                              return (
                                                <tr
                                                  key={scenario.id}
                                                  className={isSelected ? 'is-selected' : ''}
                                                >
                                                  <td className="suite-scenario-checkbox">
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() =>
                                                        handleSuiteScenarioToggle(scenario.id)
                                                      }
                                                      aria-label={`Selecionar cenário ${scenario.title}`}
                                                    />
                                                  </td>
                                                  <td>{scenario.title}</td>
                                                  <td>{scenario.category}</td>
                                                  <td>{scenario.automation}</td>
                                                  <td>
                                                    <span
                                                      className={`criticality-badge ${getCriticalityClassName(
                                                        scenario.criticality,
                                                      )}`}
                                                    >
                                                      {scenario.criticality}
                                                    </span>
                                                  </td>
                                                  <td className="scenario-observation">
                                                    {scenario.observation}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="suite-form-actions">
                                <Button
                                  type="submit"
                                  isLoading={isSavingSuite}
                                  loadingText="Salvando..."
                                >
                                  {editingSuiteId ? 'Atualizar suíte' : 'Salvar suíte'}
                                </Button>
                              </div>
                            </form>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        {storeId && (
          <section className="page-container">
            <div className="card">
              <EnvironmentKanban storeId={storeId} suites={suites} scenarios={scenarios} />
            </div>
          </section>
        )}
      </Layout>

      <Modal
        isOpen={isStoreSettingsOpen}
        onClose={closeStoreSettings}
        title="Configurações da loja"
      >
        {storeSettingsError && (
          <p className="form-message form-message--error">{storeSettingsError}</p>
        )}
        <form className="form-grid" onSubmit={handleStoreSettingsSubmit}>
          <TextInput
            id="store-settings-name"
            label="Nome da loja"
            value={storeSettings.name}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, name: event.target.value }))
            }
            required
          />
          <TextInput
            id="store-settings-site"
            label="URL do site"
            value={storeSettings.site}
            onChange={(event) =>
              setStoreSettings((previous) => ({ ...previous, site: event.target.value }))
            }
            required
          />
          <div className="form-actions">
            <Button type="submit" isLoading={isUpdatingStore} loadingText="Salvando...">
              Salvar alterações
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={closeStoreSettings}
              disabled={isUpdatingStore}
            >
              Cancelar
            </Button>
          </div>
        </form>

        <div className="modal-danger-zone">
          <div>
            <h4>Remover loja</h4>
            <p>Excluirá os cenários e suítes vinculados.</p>
          </div>
          <button
            type="button"
            className="link-danger"
            onClick={() => void handleRemoveStore()}
            disabled={isDeletingStore}
          >
            Remover loja
          </button>
        </div>
      </Modal>
    </>
  );
};
