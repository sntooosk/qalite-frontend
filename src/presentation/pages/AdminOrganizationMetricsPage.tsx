import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import {
  type ScenarioExecutionMetrics,
  type QaRankingEntry,
  type ScenarioRankingEntry,
} from '../../application/services/ScenarioExecutionService';
import { organizationService, scenarioExecutionService } from '../../services';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { formatDurationFromMs } from '../../shared/utils/time';
import { Button } from '../components/Button';

export const AdminOrganizationMetricsPage = () => {
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get('organizationId');
  const { user, hasRole, isInitializing } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [metrics, setMetrics] = useState<ScenarioExecutionMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setActiveOrganization } = useOrganizationBranding();

  const canViewAllOrganizations = hasRole(['admin']);
  const belongsToOrganization = useMemo(
    () => Boolean(user?.organizationId && user.organizationId === organizationId),
    [organizationId, user?.organizationId],
  );
  const isAuthorized = canViewAllOrganizations || belongsToOrganization;

  useEffect(() => {
    if (!organizationId || isInitializing) {
      return;
    }

    if (!isAuthorized) {
      navigate('/403', { replace: true });
    }
  }, [isAuthorized, isInitializing, navigate, organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setOrganization(null);
      setError('Informe uma organização válida na URL.');
      return;
    }

    let isMounted = true;
    setIsLoadingOrganization(true);
    setError(null);

    const fetchOrganization = async () => {
      try {
        const data = await organizationService.getById(organizationId);
        if (!isMounted) {
          return;
        }
        setOrganization(data);
        setActiveOrganization(data);
        if (!data) {
          setError('Organização não encontrada.');
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError('Não foi possível carregar os dados da organização.');
          showToast({ type: 'error', message: 'Falha ao carregar organização.' });
        }
      } finally {
        if (isMounted) {
          setIsLoadingOrganization(false);
        }
      }
    };

    void fetchOrganization();

    return () => {
      isMounted = false;
      setActiveOrganization(null);
    };
  }, [organizationId, setActiveOrganization, showToast]);

  useEffect(() => {
    if (!organizationId || !isAuthorized) {
      setMetrics(null);
      return;
    }

    let isMounted = true;
    setIsLoadingMetrics(true);

    const fetchMetrics = async () => {
      try {
        const data = await scenarioExecutionService.getOrganizationMetrics(organizationId);
        if (isMounted) {
          setMetrics(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          showToast({
            type: 'error',
            message: 'Não foi possível carregar as métricas desta organização.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingMetrics(false);
        }
      }
    };

    void fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [organizationId, isAuthorized, showToast]);

  const renderQaRanking = (ranking: QaRankingEntry[]) => {
    if (ranking.length === 0) {
      return <p className="section-subtitle">Nenhum registro de execução encontrado.</p>;
    }

    return (
      <div className="table-scroll-area">
        <table className="data-table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>QA</th>
              <th>Tempo médio</th>
              <th>Melhor tempo</th>
              <th>Execuções</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry, index) => (
              <tr key={`${entry.qaId ?? entry.qaName}-${index}`}>
                <td>{index + 1}</td>
                <td>{entry.qaName}</td>
                <td>{formatDurationFromMs(entry.averageMs)}</td>
                <td>{formatDurationFromMs(entry.bestMs)}</td>
                <td>{entry.executions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderScenarioRanking = (ranking: ScenarioRankingEntry[]) => {
    if (ranking.length === 0) {
      return <p className="section-subtitle">Nenhuma execução registrada para os cenários.</p>;
    }

    return (
      <div className="table-scroll-area">
        <table className="data-table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Cenário</th>
              <th>Tempo médio</th>
              <th>Melhor tempo</th>
              <th>Execuções</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry, index) => (
              <tr key={`${entry.scenarioId}-${index}`}>
                <td>{index + 1}</td>
                <td>{entry.scenarioTitle}</td>
                <td>{formatDurationFromMs(entry.averageMs)}</td>
                <td>{formatDurationFromMs(entry.bestMs)}</td>
                <td>{entry.executions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const fastestQa = metrics?.fastestQa ?? null;

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <h1 className="section-title">Desempenho por cenário</h1>
            <p className="section-subtitle">
              Acompanhe os QAs e cenários mais rápidos com base nos registros de execução.
            </p>
          </div>
          {organizationId && (
            <div className="page-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/admin/organizations?organizationId=${organizationId}`)}
              >
                Gerenciar lojas
              </Button>
            </div>
          )}
        </div>

        {error && <p className="form-message form-message--error">{error}</p>}

        {isLoadingOrganization ? (
          <p className="section-subtitle">Carregando dados da organização...</p>
        ) : !organization ? (
          <p className="section-subtitle">Nenhuma organização selecionada.</p>
        ) : (
          <div className="summary-card">
            <h3>{organization.name}</h3>
            <p className="section-subtitle">
              {organization.description || 'Monitorando desempenho das execuções cadastradas.'}
            </p>
            <span className="badge">
              {metrics?.totalExecutions ?? 0} execução
              {(metrics?.totalExecutions ?? 0) === 1 ? '' : 'es'} registradas
            </span>
          </div>
        )}

        <div className="metrics-grid">
          <div className="summary-card">
            <h3>QA mais rápido</h3>
            {isLoadingMetrics ? (
              <p className="section-subtitle">Calculando métricas...</p>
            ) : fastestQa ? (
              <div className="metric-highlight">
                <strong>{fastestQa.qaName}</strong>
                <span>Tempo médio: {formatDurationFromMs(fastestQa.averageMs)}</span>
                <span>Melhor tempo: {formatDurationFromMs(fastestQa.bestMs)}</span>
                <span>Execuções: {fastestQa.executions}</span>
              </div>
            ) : (
              <p className="section-subtitle">Nenhum QA registrado ainda.</p>
            )}
          </div>

          <div className="summary-card">
            <h3>Cenário mais rápido</h3>
            {isLoadingMetrics ? (
              <p className="section-subtitle">Calculando métricas...</p>
            ) : metrics?.scenarioRanking?.[0] ? (
              <div className="metric-highlight">
                <strong>{metrics.scenarioRanking[0].scenarioTitle}</strong>
                <span>
                  Tempo médio: {formatDurationFromMs(metrics.scenarioRanking[0].averageMs)}
                </span>
                <span>Melhor tempo: {formatDurationFromMs(metrics.scenarioRanking[0].bestMs)}</span>
                <span>Execuções: {metrics.scenarioRanking[0].executions}</span>
              </div>
            ) : (
              <p className="section-subtitle">Nenhum cenário executado até o momento.</p>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <h3 className="section-title">Ranking de QAs</h3>
            {isLoadingMetrics ? (
              <p className="section-subtitle">Carregando ranking...</p>
            ) : (
              renderQaRanking(metrics?.qaRanking ?? [])
            )}
          </div>

          <div className="card">
            <h3 className="section-title">Cenários mais rápidos</h3>
            {isLoadingMetrics ? (
              <p className="section-subtitle">Carregando ranking...</p>
            ) : (
              renderScenarioRanking(metrics?.scenarioRanking ?? [])
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};
