import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { useAuth } from '../hooks/useAuth';
import { useOrganizationSprints } from '../hooks/useOrganizationSprints';
import { Alert } from '../components/Alert';
import type { CreateSprintPayload, Sprint } from '../../domain/entities/sprint';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { ActivityIcon, BarChartIcon, FilterIcon, SparklesIcon } from '../components/icons';

const buildSprintStats = (sprints: Sprint[]) => {
  const totalTests = sprints.reduce((acc, sprint) => acc + sprint.testCases.length, 0);
  const totalConcluded = sprints.reduce(
    (acc, sprint) => acc + sprint.testCases.filter((test) => test.status === 'concluido').length,
    0,
  );
  const totalFailed = sprints.reduce(
    (acc, sprint) => acc + sprint.testCases.filter((test) => test.status === 'falhou').length,
    0,
  );
  const openBugs = sprints.reduce(
    (acc, sprint) => acc + sprint.bugs.filter((bug) => bug.status === 'aberto').length,
    0,
  );

  return { totalTests, totalConcluded, totalFailed, openBugs };
};

const buildEnvironmentOptions = (sprints: Sprint[]) => {
  const options = new Set<string>();
  sprints.forEach((sprint) => options.add(sprint.environment));
  return Array.from(options);
};

export const SprintsPage = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const belongsToOrg = !user?.organizationId || user.organizationId === orgId || isAdmin;
  const { sprints, history, isLoading, addSprint, removeSprint } = useOrganizationSprints(orgId);

  const [filterEnvironment, setFilterEnvironment] = useState<string>('');
  const [formData, setFormData] = useState<CreateSprintPayload>({
    name: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    environment: '',
    project: '',
    store: '',
  });

  const environments = useMemo(() => buildEnvironmentOptions(sprints), [sprints]);
  const filteredSprints = useMemo(
    () =>
      filterEnvironment
        ? sprints.filter((sprint) => sprint.environment === filterEnvironment)
        : sprints,
    [filterEnvironment, sprints],
  );
  const stats = useMemo(() => buildSprintStats(filteredSprints), [filteredSprints]);

  if (!orgId) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }

    addSprint(formData);
    setFormData({ ...formData, name: '', environment: '', project: '', store: '' });
  };

  const handleDelete = (sprintId: string) => {
    if (!isAdmin) return;
    removeSprint(sprintId);
  };

  if (!belongsToOrg) {
    return (
      <Layout>
        <section className="card">
          <BackButton label="Voltar" onClick={() => navigate(-1)} />
          <h1 className="section-title">Acesso restrito</h1>
          <p className="section-subtitle">
            Você não faz parte desta organização. Solicite acesso a um administrador.
          </p>
        </section>
      </Layout>
    );
  }

  const bugBarData = filteredSprints.map((sprint) => ({
    label: sprint.name,
    value: sprint.bugs.filter((bug) => bug.status === 'aberto').length,
  }));

  const executionBarData = filteredSprints.map((sprint) => ({
    label: sprint.name,
    value: sprint.testCases.filter((test) => test.status !== 'pendente').length,
  }));

  return (
    <Layout>
      <div className="page-header">
        <div>
          <BackButton label="Voltar" onClick={() => navigate('/organization')} />
          <span className="badge">Sprints da organização</span>
          <h1 className="section-title">Planejamento e acompanhamento</h1>
          <p className="section-subtitle">
            Crie sprints, registre casos de teste, bugs e acompanhe o avanço da qualidade em tempo
            real.
          </p>
        </div>
        <div className="header-actions">
          <div className="pill">
            <ActivityIcon className="icon" aria-hidden />
            <span>{sprints.length} sprint(s)</span>
          </div>
          <div className="pill">
            <SparklesIcon className="icon" aria-hidden />
            <span>Visão compartilhada</span>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <Alert
          type="info"
          message="Apenas administradores podem criar, editar ou deletar sprints."
        />
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <span className="badge">Nova sprint</span>
            <h3>Cadastre janela e escopo</h3>
          </div>
          <div className="inline-form">
            <FilterIcon className="icon" aria-hidden />
            <label className="select-label">
              Ambiente
              <select
                value={filterEnvironment}
                onChange={(event) => setFilterEnvironment(event.target.value)}
              >
                <option value="">Todos</option>
                {environments.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <form className="sprint-form" onSubmit={handleSubmit}>
          <TextInput
            id="sprint-name"
            label="Nome da sprint"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Ex.: Sprint 28 - Checkout"
            required
            disabled={!isAdmin}
          />

          <div className="form-grid">
            <TextInput
              id="sprint-environment"
              label="Ambiente"
              value={formData.environment}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, environment: event.target.value }))
              }
              placeholder="Homolog, Produção, Dev..."
              required
              disabled={!isAdmin}
            />
            <TextInput
              id="sprint-project"
              label="Projeto"
              value={formData.project}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, project: event.target.value }))
              }
              placeholder="Aplicativo, Web, API"
              required
              disabled={!isAdmin}
            />
            <TextInput
              id="sprint-store"
              label="Loja / Squad"
              value={formData.store}
              onChange={(event) => setFormData((prev) => ({ ...prev, store: event.target.value }))}
              placeholder="Loja X, Squad Payments"
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="form-grid">
            <TextInput
              id="sprint-start"
              label="Início"
              type="date"
              value={formData.startDate}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, startDate: event.target.value }))
              }
              required
              disabled={!isAdmin}
            />
            <TextInput
              id="sprint-end"
              label="Fim"
              type="date"
              value={formData.endDate}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, endDate: event.target.value }))
              }
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="sprint-form__actions">
            <Button type="submit" disabled={!isAdmin}>
              Criar sprint
            </Button>
            {!isAdmin && (
              <span className="muted">Somente administradores podem criar sprints.</span>
            )}
          </div>
        </form>
      </section>

      <section className="list-grid">
        <SimpleBarChart
          title="Bugs abertos por sprint"
          description="Visão rápida dos itens em aberto por ambiente"
          data={bugBarData}
          emptyMessage="Nenhum bug registrado ainda."
          icon={<BarChartIcon className="icon" />}
        />
        <SimpleBarChart
          title="Execução de testes"
          description="Casos em andamento e concluídos"
          data={executionBarData}
          emptyMessage="Nenhuma execução registrada."
          variant="info"
          icon={<SparklesIcon className="icon" />}
        />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <span className="badge">Sprints</span>
            <h3>Visão em lista</h3>
          </div>
          <div className="stat-pill">
            <strong>{stats.totalTests}</strong>
            <span>Casos de teste</span>
          </div>
          <div className="stat-pill">
            <strong>{stats.totalConcluded}</strong>
            <span>Concluídos</span>
          </div>
          <div className="stat-pill">
            <strong>{stats.totalFailed}</strong>
            <span>Falhos</span>
          </div>
          <div className="stat-pill">
            <strong>{stats.openBugs}</strong>
            <span>Bugs abertos</span>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">Carregando sprints...</p>
        ) : filteredSprints.length === 0 ? (
          <p className="section-subtitle">Nenhuma sprint cadastrada ainda.</p>
        ) : (
          <div className="sprint-grid">
            {filteredSprints.map((sprint) => {
              const totalTests = sprint.testCases.length;
              const concluded = sprint.testCases.filter(
                (test) => test.status === 'concluido',
              ).length;
              const failed = sprint.testCases.filter((test) => test.status === 'falhou').length;
              const progress = totalTests === 0 ? 0 : Math.round((concluded / totalTests) * 100);

              return (
                <article key={sprint.id} className="sprint-card">
                  <header className="sprint-card__header">
                    <div>
                      <span className="badge neutral">{sprint.environment}</span>
                      <h4>{sprint.name}</h4>
                      <p className="section-subtitle">
                        {sprint.project} • {sprint.store}
                      </p>
                    </div>
                    <div className="sprint-card__dates">
                      <span>{sprint.startDate}</span>
                      <span>→</span>
                      <span>{sprint.endDate}</span>
                    </div>
                  </header>

                  <div className="sprint-card__metrics">
                    <div>
                      <strong>{totalTests}</strong>
                      <span>testes</span>
                    </div>
                    <div>
                      <strong>{concluded}</strong>
                      <span>concluídos</span>
                    </div>
                    <div>
                      <strong>{failed}</strong>
                      <span>falhos</span>
                    </div>
                    <div>
                      <strong>{sprint.bugs.filter((bug) => bug.status === 'aberto').length}</strong>
                      <span>bugs abertos</span>
                    </div>
                  </div>

                  <div className="progress-bar" aria-label="Progresso da sprint">
                    <span className="progress-bar__fill" style={{ width: `${progress}%` }} />
                    <span className="progress-bar__label">{progress}% de conclusão</span>
                  </div>

                  <div className="sprint-card__actions">
                    <Link to={`/organizations/${orgId}/sprints/${sprint.id}`} className="text-link">
                      Abrir detalhes
                    </Link>
                    {isAdmin && (
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => handleDelete(sprint.id)}
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <span className="badge">Histórico</span>
            <h3>Últimas entregas</h3>
            <p className="section-subtitle">
              Acompanhe as últimas sprints registradas nesta organização.
            </p>
          </div>
        </div>
        <ul className="timeline">
          {history.slice(0, 5).map((sprint) => (
            <li key={sprint.id}>
              <div className="timeline__title">{sprint.name}</div>
              <p className="section-subtitle">
                {sprint.environment} • {sprint.project} • {sprint.startDate} - {sprint.endDate}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
};
