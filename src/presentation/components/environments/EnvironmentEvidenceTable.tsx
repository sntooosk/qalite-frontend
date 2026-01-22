import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
} from '../../../domain/entities/environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';
import {
  ScenarioColumnSortControl,
  createScenarioSortComparator,
  type ScenarioSortConfig,
} from '../ScenarioColumnSortControl';
import { ENVIRONMENT_PLATFORM_LABEL } from '../../../shared/config/environmentLabels';
import { isAutomatedScenario } from '../../../shared/utils/automation';
import { getCriticalityClassName, getCriticalityLabelKey } from '../../constants/scenarioOptions';
import { normalizeCriticalityEnum } from '../../../shared/utils/scenarioEnums';
import { useToast } from '../../context/ToastContext';
import { PaginationControls } from '../PaginationControls';
import { EyeIcon } from '../icons';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
  onViewDetails?: (scenarioId: string) => void;
}

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
  onViewDetails,
}: EnvironmentEvidenceTableProps) => {
  const { t: translation } = useTranslation();
  const { isUpdating, changeScenarioStatus } = useScenarioEvidence(environment.id);
  const { showToast } = useToast();
  const [scenarioSort, setScenarioSort] = useState<ScenarioSortConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const canViewDetails = Boolean(onViewDetails);

  const BASE_STATUS_OPTIONS = [
    { value: 'pendente', label: translation('environmentEvidenceTable.status_pendente') },
    { value: 'em_andamento', label: translation('environmentEvidenceTable.status_em_andamento') },
    { value: 'bloqueado', label: translation('environmentEvidenceTable.status_bloqueado') },
    { value: 'concluido', label: translation('environmentEvidenceTable.status_concluido') },
    { value: 'nao_se_aplica', label: translation('environmentEvidenceTable.status_nao_se_aplica') },
  ];

  const AUTOMATED_STATUS_OPTION = {
    value: 'concluido_automatizado',
    label: translation('environmentEvidenceTable.status_concluido_automatizado'),
  };

  const getScenarioStatusOptions = (scenario: EnvironmentScenario) =>
    isAutomatedScenario(scenario.automatizado)
      ? [
          ...BASE_STATUS_OPTIONS.slice(0, 3),
          AUTOMATED_STATUS_OPTION,
          ...BASE_STATUS_OPTIONS.slice(3),
        ]
      : BASE_STATUS_OPTIONS;

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
  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = data.categoria?.trim();
      if (normalized) {
        categories.add(normalized);
      }
    });
    return Array.from(categories).sort((first, second) =>
      first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [scenarioEntries]);
  const criticalityOptions = useMemo(() => {
    const criticalities = new Set<string>();
    scenarioEntries.forEach(([, data]) => {
      const normalized = normalizeCriticalityEnum(data.criticidade);
      if (normalized) {
        criticalities.add(normalized);
      }
    });
    return Array.from(criticalities).sort((first, second) =>
      first.localeCompare(second, 'pt-BR', { sensitivity: 'base' }),
    );
  }, [scenarioEntries]);
  const filteredScenarioEntries = useMemo(
    () =>
      scenarioEntries.filter(([, data]) => {
        const matchesCategory = categoryFilter ? data.categoria === categoryFilter : true;
        const matchesCriticality = criticalityFilter
          ? normalizeCriticalityEnum(data.criticidade) === criticalityFilter
          : true;
        return matchesCategory && matchesCriticality;
      }),
    [categoryFilter, criticalityFilter, scenarioEntries],
  );
  const orderedScenarioEntries = useMemo(() => {
    if (!scenarioSort) {
      return filteredScenarioEntries;
    }

    const comparator = createScenarioSortComparator(scenarioSort);
    return filteredScenarioEntries.slice().sort(([, first], [, second]) =>
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
  }, [filteredScenarioEntries, scenarioSort]);
  const paginatedScenarioEntries = useMemo(
    () => orderedScenarioEntries.slice(0, visibleCount),
    [orderedScenarioEntries, visibleCount],
  );
  const isReadOnly = Boolean(isLocked || readOnly);
  useEffect(() => {
    setVisibleCount(20);
  }, [categoryFilter, criticalityFilter, scenarioSort, scenarioEntries.length]);

  const formatCriticalityLabel = (value?: string | null) => {
    const labelKey = getCriticalityLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };
  const handleStatusChange = async (
    scenarioId: string,
    platform: EnvironmentScenarioPlatform,
    status: EnvironmentScenarioStatus,
  ) => {
    if (isReadOnly) {
      return;
    }

    const scenario = environment.scenarios?.[scenarioId];
    if (!scenario) {
      showToast({
        type: 'error',
        message: translation('environmentEvidenceTable.toast_not_found'),
      });
      return;
    }

    await changeScenarioStatus(scenarioId, status, platform);
  };

  if (scenarioEntries.length === 0) {
    return (
      <p className="section-subtitle">{translation('environmentEvidenceTable.cenarios_vazio')}</p>
    );
  }

  if (filteredScenarioEntries.length === 0) {
    return (
      <p className="section-subtitle">
        {translation('environmentEvidenceTable.cenarios_sem_filtro')}
      </p>
    );
  }

  return (
    <div className="environment-table">
      <div className="environment-table__filters">
        <label className="environment-table__filter">
          <span>{translation('environmentEvidenceTable.filters_categoria')}</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label={translation('environmentEvidenceTable.filters_categoria')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="environment-table__filter">
          <span>{translation('environmentEvidenceTable.filters_criticidade')}</span>
          <select
            value={criticalityFilter}
            onChange={(event) => setCriticalityFilter(event.target.value)}
            aria-label={translation('environmentEvidenceTable.filters_criticidade')}
          >
            <option value="">{translation('environmentEvidenceTable.filters_todas')}</option>
            {criticalityOptions.map((option) => {
              const labelKey = getCriticalityLabelKey(option);
              const label = labelKey ? translation(labelKey) : option;
              return (
                <option key={option} value={option}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>{translation('environmentEvidenceTable.table_titulo')}</th>
            <th>
              <ScenarioColumnSortControl
                label={translation('environmentEvidenceTable.table_categoria')}
                field="category"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>
              <ScenarioColumnSortControl
                label={translation('environmentEvidenceTable.table_criticidade')}
                field="criticality"
                sort={scenarioSort}
                onChange={setScenarioSort}
              />
            </th>
            <th>{translation('environmentEvidenceTable.table_status_mobile')}</th>
            <th>{translation('environmentEvidenceTable.table_status_desktop')}</th>
            {canViewDetails && (
              <th className="scenario-actions-header">{translation('storeSummary.viewDetails')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {paginatedScenarioEntries.map(([scenarioId, data]) => {
            const statusOptions = getScenarioStatusOptions(data);
            return (
              <tr key={scenarioId}>
                <td>{data.titulo}</td>
                <td>{data.categoria}</td>
                <td>
                  <span
                    className={`criticality-badge ${getCriticalityClassName(data.criticidade)}`}
                  >
                    {formatCriticalityLabel(data.criticidade)}
                  </span>
                </td>

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
                {canViewDetails && (
                  <td className="scenario-actions">
                    <div className="scenario-actions__content">
                      <button
                        type="button"
                        onClick={() => onViewDetails?.(scenarioId)}
                        className="action-button action-button--primary"
                      >
                        <EyeIcon aria-hidden className="action-button__icon" />
                        {translation('storeSummary.viewDetails')}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <PaginationControls
        total={orderedScenarioEntries.length}
        visible={paginatedScenarioEntries.length}
        step={20}
        onShowLess={() => setVisibleCount(20)}
        onShowMore={() =>
          setVisibleCount((previous) => Math.min(previous + 20, orderedScenarioEntries.length))
        }
      />
      {isUpdating && (
        <p className="section-subtitle">{translation('environmentEvidenceTable.sincronizando')}</p>
      )}
    </div>
  );
};
