import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import type {
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../../domain/entities/Environment';
import { formatDurationFromMs } from '../../../shared/utils/time';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  type ScenarioSortConfig,
} from '../ScenarioColumnSortControl';
import { ENVIRONMENT_PLATFORM_LABEL } from '../../../shared/constants/environmentLabels';
import { isAutomatedScenario } from '../../../shared/utils/automation';
import { useToast } from '../../context/ToastContext';
import { scenarioExecutionService } from '../../../services';
import { useAuth } from '../../hooks/useAuth';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
  onRegisterBug?: (scenarioId: string) => void;
  bugCountByScenario?: Record<string, number>;
  organizationId?: string | null;
}

const BASE_STATUS_OPTIONS: { value: EnvironmentScenarioStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
];

const AUTOMATED_STATUS_OPTION: { value: EnvironmentScenarioStatus; label: string } = {
  value: 'concluido_automatizado',
  label: 'Concluído automatizado',
};

const getScenarioStatusOptions = (scenario: EnvironmentScenario) =>
  isAutomatedScenario(scenario.automatizado)
    ? [...BASE_STATUS_OPTIONS.slice(0, 3), AUTOMATED_STATUS_OPTION, ...BASE_STATUS_OPTIONS.slice(3)]
    : BASE_STATUS_OPTIONS;

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
  onRegisterBug,
  bugCountByScenario,
  organizationId,
}: EnvironmentEvidenceTableProps) => {
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const { showToast } = useToast();
  const { user } = useAuth();
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [loggingTimers, setLoggingTimers] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());
  const scenarioEntries = useMemo(() => {
    const entries = Object.entries(environment.scenarios ?? {});

    return entries.sort(([firstId, first], [secondId, second]) => {
      const firstTitle = first.titulo?.trim() ?? '';
      const secondTitle = second.titulo?.trim() ?? '';
      const diff = firstTitle.localeCompare(secondTitle, 'pt-BR', { sensitivity: 'base' });

      if (diff !== 0) {
        return diff;
      }

      return firstId.localeCompare(secondId, 'pt-BR', { sensitivity: 'base' });
    });
  }, [environment.scenarios]);
  const orderedScenarioEntries = useMemo(() => {
    if (!scenarioSort) {
      return scenarioEntries;
    }

    const comparator = createScenarioSortComparator(scenarioSort);

    return scenarioEntries.slice().sort(([, first], [, second]) =>
      comparator(
        {
          criticality: first.criticidade,
          category: first.categoria,
          automation: first.automatizado ?? '',
          title: first.titulo,
        },
        {
          criticality: second.criticidade,
          category: second.categoria,
          automation: second.automatizado ?? '',
          title: second.titulo,
        },
      ),
    );
  }, [scenarioEntries, scenarioSort]);
  const isReadOnly = Boolean(isLocked || readOnly);
  const qaDisplayName = useMemo(
    () => user?.displayName?.trim() || user?.email || 'Seu usuário',
    [user?.displayName, user?.email],
  );

  useEffect(() => {
    if (Object.keys(activeTimers).length === 0) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeTimers]);

  const handleStatusChange = async (
    scenarioId: string,
    platform: EnvironmentScenarioPlatform,
    status: EnvironmentScenarioStatus,
  ) => {
    if (isReadOnly) {
      return;
    }

    await changeScenarioStatus(scenarioId, status, platform);
  };

  const handleFileChange = async (scenarioId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    await handleEvidenceUpload(scenarioId, file);
    event.target.value = '';
  };

  const handleStartTimer = (scenarioId: string) => {
    if (isReadOnly) {
      return;
    }

    if (!organizationId) {
      showToast({
        type: 'error',
        message: 'Associe a loja a uma organização para registrar o tempo do cenário.',
      });
      return;
    }

    setActiveTimers((previous) => {
      if (previous[scenarioId]) {
        return previous;
      }
      return { ...previous, [scenarioId]: Date.now() };
    });
  };

  const handleStopTimer = async (scenarioId: string) => {
    const startedAt = activeTimers[scenarioId];
    if (!startedAt || isReadOnly) {
      return;
    }

    if (!organizationId) {
      showToast({
        type: 'error',
        message: 'Associe a loja a uma organização para registrar o tempo do cenário.',
      });
      return;
    }

    const scenario = environment.scenarios?.[scenarioId];
    if (!scenario) {
      showToast({ type: 'error', message: 'Cenário não encontrado para registrar o tempo.' });
      return;
    }

    setLoggingTimers((previous) => ({ ...previous, [scenarioId]: true }));
    const payload = {
      organizationId,
      storeId: environment.storeId,
      environmentId: environment.id,
      scenarioId,
      scenarioTitle: scenario.titulo,
      qaId: user?.uid ?? null,
      qaName: user?.displayName || user?.email || null,
      totalMs: Date.now() - startedAt,
      executedAt: new Date().toISOString(),
    };

    let hasSucceeded = false;
    try {
      await scenarioExecutionService.logExecution(payload);
      showToast({ type: 'success', message: 'Tempo registrado com sucesso.' });
      hasSucceeded = true;
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível registrar o tempo do cenário.' });
    } finally {
      setLoggingTimers((previous) => {
        const next = { ...previous };
        delete next[scenarioId];
        return next;
      });

      if (hasSucceeded) {
        setActiveTimers((previous) => {
          const next = { ...previous };
          delete next[scenarioId];
          return next;
        });
      }
    }
  };

  const getElapsedTime = (scenarioId: string) => {
    const startedAt = activeTimers[scenarioId];
    if (!startedAt) {
      return 0;
    }

    return now - startedAt;
  };

  if (scenarioEntries.length === 0) {
    return <p className="section-subtitle">Nenhum cenário associado a este ambiente.</p>;
  }

  return (
    <div className="environment-table">
      <table className="data-table">
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
                label="Criticidade"
                field="criticality"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>Status Mobile</th>
            <th>Status Desktop</th>
            <th>Tempo de execução</th>
            <th>Evidência</th>
            <th>Bug</th>
          </tr>
        </thead>
        <tbody>
          {orderedScenarioEntries.map(([scenarioId, data]) => {
            const statusOptions = getScenarioStatusOptions(data);
            return (
              <tr key={scenarioId}>
                <td>{data.titulo}</td>
                <td>{data.categoria}</td>
                <td>{data.criticidade}</td>
                {(['mobile', 'desktop'] as EnvironmentScenarioPlatform[]).map((platform) => {
                  const currentStatus =
                    platform === 'mobile'
                      ? (data.statusMobile ?? data.status)
                      : (data.statusDesktop ?? data.status);
                  const selectId = `${scenarioId}-${platform}-status`;
                  return (
                    <td key={selectId} className="scenario-status-column">
                      <div className="scenario-status-cell">
                        <label htmlFor={selectId}>{ENVIRONMENT_PLATFORM_LABEL[platform]}</label>
                        <select
                          id={selectId}
                          className={`scenario-status-select scenario-status-select--${currentStatus}`}
                          value={currentStatus}
                          disabled={isReadOnly}
                          aria-label={`Status ${ENVIRONMENT_PLATFORM_LABEL[platform]} do cenário ${data.titulo}`}
                          onChange={(event) =>
                            handleStatusChange(
                              scenarioId,
                              platform,
                              event.target.value as EnvironmentScenarioStatus,
                            )
                          }
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  );
                })}
                <td>
                  <div className="scenario-timer-cell">
                    <span className="scenario-timer-display">
                      {formatDurationFromMs(getElapsedTime(scenarioId))}
                    </span>
                    <span className="scenario-timer-hint">Responsável: {qaDisplayName}</span>
                    {!organizationId && (
                      <span className="scenario-timer-hint">
                        Vincule a loja a uma organização para habilitar o registro.
                      </span>
                    )}
                    <div className="scenario-timer-actions">
                      <button
                        type="button"
                        className="scenario-timer-button"
                        onClick={() => handleStartTimer(scenarioId)}
                        disabled={
                          isReadOnly || Boolean(activeTimers[scenarioId]) || !organizationId
                        }
                      >
                        Iniciar
                      </button>
                      <button
                        type="button"
                        className="scenario-timer-button scenario-timer-button--primary"
                        onClick={() => void handleStopTimer(scenarioId)}
                        disabled={
                          isReadOnly ||
                          !activeTimers[scenarioId] ||
                          Boolean(loggingTimers[scenarioId])
                        }
                      >
                        {loggingTimers[scenarioId] ? 'Registrando...' : 'Finalizar'}
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="scenario-evidence-cell">
                    {data.evidenciaArquivoUrl ? (
                      <a
                        href={data.evidenciaArquivoUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-link"
                      >
                        Abrir evidência
                      </a>
                    ) : (
                      <span className="section-subtitle">Sem arquivo</span>
                    )}
                    {!isReadOnly && (
                      <label className="environment-upload">
                        <input
                          type="file"
                          accept="image/*,application/pdf,video/mp4,video/quicktime,application/zip,application/x-zip-compressed"
                          onChange={(event) => handleFileChange(scenarioId, event)}
                        />
                        <span>Enviar arquivo</span>
                      </label>
                    )}
                  </div>
                </td>
                <td>
                  <div className="scenario-bug-cell">
                    <span className="scenario-bug-cell__label">
                      {(() => {
                        const count = bugCountByScenario?.[scenarioId] ?? 0;
                        if (count === 0) {
                          return 'Nenhum bug registrado';
                        }
                        if (count === 1) {
                          return '1 bug registrado';
                        }
                        return `${count} bugs registrados`;
                      })()}
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="scenario-bug-cell__action"
                        onClick={() => onRegisterBug?.(scenarioId)}
                        disabled={isUpdating || !onRegisterBug}
                      >
                        Registrar bug
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isUpdating && <p className="section-subtitle">Sincronizando evidências...</p>}
    </div>
  );
};
