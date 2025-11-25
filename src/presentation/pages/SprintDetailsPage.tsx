import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';
import { TextInput } from '../components/TextInput';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationSprints } from '../hooks/useOrganizationSprints';
import { Alert } from '../components/Alert';
import type { SprintBug, SprintTestCase, TestCaseStatus } from '../../domain/entities/sprint';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { ActivityIcon, BarChartIcon, SparklesIcon } from '../components/icons';

const STATUS_LABELS: Record<TestCaseStatus, string> = {
  pendente: 'Pendente',
  executando: 'Executando',
  concluido: 'Concluído',
  falhou: 'Falhou',
};

const BUG_STATUS_LABELS: Record<SprintBug['status'], string> = {
  aberto: 'Aberto',
  fechado: 'Fechado',
};

const buildBugChart = (bugs: SprintBug[]) => {
  const grouped = bugs.reduce<Record<string, number>>((acc, bug) => {
    const day = bug.createdAt.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([label, value]) => ({ label, value }));
};

const buildExecutionChart = (testCases: SprintTestCase[]) => {
  const executed = testCases.filter((test) => test.status !== 'pendente');
  return executed.map((test, index) => ({ label: `${index + 1}`, value: index + 1 }));
};

export const SprintDetailsPage = () => {
  const { orgId, sprintId } = useParams<{ orgId: string; sprintId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { sprints, addTestCase, updateTestCaseStatus, addBug, updateBugStatus, updateNotes } =
    useOrganizationSprints(orgId);

  const sprint = useMemo(() => sprints.find((item) => item.id === sprintId), [sprintId, sprints]);
  const [newTestCase, setNewTestCase] = useState('');
  const [newBugTitle, setNewBugTitle] = useState('');
  const [newBugDescription, setNewBugDescription] = useState('');

  const bugChart = useMemo(() => buildBugChart(sprint?.bugs ?? []), [sprint?.bugs]);
  const executionChart = useMemo(
    () => buildExecutionChart(sprint?.testCases ?? []),
    [sprint?.testCases],
  );

  if (!sprint || !orgId || !sprintId) {
    return (
      <Layout>
        <section className="card">
          <BackButton label="Voltar" onClick={() => navigate(-1)} />
          <h1 className="section-title">Sprint não encontrada</h1>
          <p className="section-subtitle">
            Verifique se a sprint ainda está ativa ou foi removida.
          </p>
        </section>
      </Layout>
    );
  }

  const totalTests = sprint.testCases.length;
  const concluded = sprint.testCases.filter((test) => test.status === 'concluido').length;
  const failed = sprint.testCases.filter((test) => test.status === 'falhou').length;
  const progress = totalTests === 0 ? 0 : Math.round((concluded / totalTests) * 100);
  const openBugs = sprint.bugs.filter((bug) => bug.status === 'aberto').length;

  const handleAddTestCase = (event: FormEvent) => {
    event.preventDefault();
    const title = newTestCase.trim();
    if (!title) return;
    addTestCase(sprint.id, title);
    setNewTestCase('');
  };

  const handleAddBug = (event: FormEvent) => {
    event.preventDefault();
    const title = newBugTitle.trim();
    const description = newBugDescription.trim();
    if (!title || !description) return;
    addBug(sprint.id, title, description);
    setNewBugTitle('');
    setNewBugDescription('');
  };

  const handleStatusChange = (testCaseId: string, status: TestCaseStatus) => {
    updateTestCaseStatus(sprint.id, testCaseId, status);
  };

  const handleBugStatusChange = (bugId: string, status: SprintBug['status']) => {
    updateBugStatus(sprint.id, bugId, status);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <BackButton label="Voltar" onClick={() => navigate(`/organizations/${orgId}/sprints`)} />
          <span className="badge">Sprint</span>
          <h1 className="section-title">{sprint.name}</h1>
          <p className="section-subtitle">
            Ambiente {sprint.environment} • {sprint.project} • {sprint.store}
          </p>
        </div>
        <div className="header-actions">
          <div className="pill">
            <ActivityIcon className="icon" aria-hidden />
            <span>{progress}% de conclusão</span>
          </div>
          <div className="pill">
            <SparklesIcon className="icon" aria-hidden />
            <span>{openBugs} bugs abertos</span>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <Alert type="info" message="Somente administradores podem editar ou deletar sprints." />
      )}

      <section className="list-grid">
        <div className="card">
          <span className="badge">Resumo</span>
          <h3>Indicadores rápidos</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{totalTests}</strong>
              <span>Casos de teste</span>
            </div>
            <div className="summary-card">
              <strong>{concluded}</strong>
              <span>Concluídos</span>
            </div>
            <div className="summary-card">
              <strong>{failed}</strong>
              <span>Falhos</span>
            </div>
            <div className="summary-card">
              <strong>{openBugs}</strong>
              <span>Bugs abertos</span>
            </div>
          </div>
          <div className="progress-bar" aria-label="Progresso da sprint">
            <span className="progress-bar__fill" style={{ width: `${progress}%` }} />
            <span className="progress-bar__label">{progress}% de conclusão da sprint</span>
          </div>
        </div>

        <SimpleBarChart
          title="Bugs registrados por dia"
          data={bugChart}
          emptyMessage="Ainda não há bugs nesta sprint."
          icon={<BarChartIcon className="icon" />}
        />
        <SimpleBarChart
          title="Evolução dos testes executados"
          data={executionChart}
          emptyMessage="Nenhuma execução registrada ainda."
          variant="info"
          icon={<SparklesIcon className="icon" />}
        />
      </section>

      <section className="list-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge">Casos de teste</span>
              <h3>Controle de execução</h3>
            </div>
            <form className="inline-form" onSubmit={handleAddTestCase}>
              <TextInput
                id="test-case-title"
                label=""
                placeholder="Cadastrar caso de teste"
                value={newTestCase}
                onChange={(event) => setNewTestCase(event.target.value)}
                required
              />
              <Button type="submit">Adicionar</Button>
            </form>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sprint.testCases.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="section-subtitle">
                      Nenhum caso registrado ainda.
                    </td>
                  </tr>
                ) : (
                  sprint.testCases.map((testCase) => (
                    <tr key={testCase.id}>
                      <td>{testCase.title}</td>
                      <td>
                        <select
                          value={testCase.status}
                          onChange={(event) =>
                            handleStatusChange(testCase.id, event.target.value as TestCaseStatus)
                          }
                        >
                          {Object.keys(STATUS_LABELS).map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status as TestCaseStatus]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge">Bugs</span>
              <h3>Achados da sprint</h3>
            </div>
            <form className="inline-form" onSubmit={handleAddBug}>
              <TextInput
                id="bug-title"
                label=""
                placeholder="Título do bug"
                value={newBugTitle}
                onChange={(event) => setNewBugTitle(event.target.value)}
                required
              />
              <TextInput
                id="bug-description"
                label=""
                placeholder="Descrição rápida"
                value={newBugDescription}
                onChange={(event) => setNewBugDescription(event.target.value)}
                required
              />
              <Button type="submit">Registrar</Button>
            </form>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {sprint.bugs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="section-subtitle">
                      Nenhum bug registrado.
                    </td>
                  </tr>
                ) : (
                  sprint.bugs.map((bug) => (
                    <tr key={bug.id}>
                      <td>{bug.title}</td>
                      <td>{bug.description}</td>
                      <td>
                        <select
                          value={bug.status}
                          onChange={(event) =>
                            handleBugStatusChange(bug.id, event.target.value as SprintBug['status'])
                          }
                        >
                          {Object.keys(BUG_STATUS_LABELS).map((status) => (
                            <option key={status} value={status}>
                              {BUG_STATUS_LABELS[status as SprintBug['status']]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(bug.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <span className="badge">Notas da sprint</span>
            <h3>Contexto compartilhado</h3>
          </div>
        </div>
        <TextArea
          id="sprint-notes"
          label=""
          value={sprint.notes}
          onChange={(event) => updateNotes(sprint.id, event.target.value)}
          placeholder="Liste descobertas, riscos e decisões da daily."
        />
      </section>
    </Layout>
  );
};
