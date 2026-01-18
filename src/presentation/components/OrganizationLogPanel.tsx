import { useEffect, useMemo, useState } from 'react';

import type { ActivityEntityType, ActivityLog } from '../../domain/entities/activityLog';
import { logService } from '../../application/use-cases/LogUseCase';
import { useToast } from '../context/ToastContext';
import { ActivityIcon, ChevronDownIcon, FilterIcon } from './icons';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

interface OrganizationLogPanelProps {
  organizationId: string;
  entityTypes?: ActivityEntityType[];
  entityId?: string;
  defaultCollapsed?: boolean;
  hideEntityFilter?: boolean;
}

const ENTITY_FILTERS = [
  { value: 'all', label: 'logPanel.entityAll' },
  { value: 'organization', label: 'logPanel.entityOrganization' },
  { value: 'store', label: 'logPanel.entityStore' },
  { value: 'scenario', label: 'logPanel.entityScenario' },
  { value: 'suite', label: 'logPanel.entitySuite' },
  { value: 'environment', label: 'logPanel.entityEnvironment' },
  { value: 'environment_bug', label: 'logPanel.entityEnvironmentBug' },
  { value: 'environment_participant', label: 'logPanel.entityEnvironmentParticipant' },
];

const ACTION_FILTERS: { value: ActivityLog['action'] | 'all'; label: string }[] = [
  { value: 'all', label: 'logPanel.actionAll' },
  { value: 'create', label: 'logPanel.actionCreate' },
  { value: 'update', label: 'logPanel.actionUpdate' },
  { value: 'delete', label: 'logPanel.actionDelete' },
  { value: 'status_change', label: 'logPanel.actionStatusChange' },
  { value: 'attachment', label: 'logPanel.actionAttachment' },
  { value: 'participation', label: 'logPanel.actionParticipation' },
];

const INITIAL_LOG_PAGE_SIZE = 5;

const formatLogDate = (value: Date | null): string => {
  if (!value) {
    return i18n.t('logPanel.dateUnavailable');
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
};

export const OrganizationLogPanel = ({
  organizationId,
  entityTypes,
  entityId,
  defaultCollapsed = true,
  hideEntityFilter = false,
}: OrganizationLogPanelProps) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [actionFilter, setActionFilter] = useState<ActivityLog['action'] | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<ActivityLog['entityType'] | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOG_PAGE_SIZE);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const entries = await logService.listByOrganization(organizationId);
        if (isMounted) {
          setLogs(entries);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          showToast({ type: 'error', message: i18n.t('logPanel.errorLoading') });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [organizationId, showToast]);

  const scopedLogs = useMemo(() => {
    if (!entityTypes && !entityId) {
      return logs;
    }

    return logs.filter((log) => {
      const matchesType = entityTypes ? entityTypes.includes(log.entityType) : true;
      const matchesId = entityId ? log.entityId === entityId : true;
      return matchesType && matchesId;
    });
  }, [entityId, entityTypes, logs]);

  const filteredLogs = useMemo(() => {
    return scopedLogs.filter(
      (log) =>
        (actionFilter === 'all' || log.action === actionFilter) &&
        (hideEntityFilter || entityFilter === 'all' || log.entityType === entityFilter),
    );
  }, [actionFilter, entityFilter, hideEntityFilter, scopedLogs]);

  useEffect(() => {
    setVisibleCount(INITIAL_LOG_PAGE_SIZE);
  }, [actionFilter, entityFilter, scopedLogs]);

  const displayedLogs = useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount],
  );

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const renderActionLabel = (action: ActivityLog['action']) => {
    switch (action) {
      case 'create':
        return t('logPanel.actionCreate');
      case 'update':
        return t('logPanel.actionUpdate');
      case 'delete':
        return t('logPanel.actionDelete');
      case 'status_change':
        return t('logPanel.actionStatusChange');
      case 'attachment':
        return t('logPanel.actionAttachment');
      case 'participation':
        return t('logPanel.actionParticipation');
      default:
        return action;
    }
  };

  const renderEntityLabel = (entity: ActivityLog['entityType']) => {
    const option = ENTITY_FILTERS.find((filter) => filter.value === entity);
    if (!option) return entity;

    switch (option.value) {
      case 'all':
        return t('logPanel.entityAll');
      case 'organization':
        return t('logPanel.entityOrganization');
      case 'store':
        return t('logPanel.entityStore');
      case 'scenario':
        return t('logPanel.entityScenario');
      case 'suite':
        return t('logPanel.entitySuite');
      case 'environment':
        return t('logPanel.entityEnvironment');
      case 'environment_bug':
        return t('logPanel.entityEnvironmentBug');
      case 'environment_participant':
        return t('logPanel.entityEnvironmentParticipant');
      default:
        return entity;
    }
  };

  const { t } = useTranslation();

  return (
    <div
      className={`card organization-log-panel${isCollapsed ? ' organization-log-panel--collapsed' : ''}`}
    >
      <div className="organization-log-panel__header">
        <div className="organization-log-panel__heading">
          <span className="icon-pill" aria-hidden>
            <ActivityIcon className="icon" />
          </span>
          <div>
            <div className="organization-log-panel__title-row">
              <span className="badge">{t('logPanel.headerAudit')}</span>
              <span className="badge badge--muted">
                {(entityTypes || entityId ? filteredLogs.length : logs.length)}{' '}
                {t('logPanel.headerRecords')}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-primary">{t('logPanel.titleMain')}</h2>
            <p className="section-subtitle">{t('logPanel.titleSubtitle')}</p>
          </div>
        </div>

        <button
          className="button button-secondary button-ghost"
          type="button"
          onClick={toggleCollapse}
        >
          {isCollapsed ? t('logPanel.buttonShow') : t('logPanel.buttonHide')}
          <ChevronDownIcon
            className={`icon icon--rotate ${isCollapsed ? '' : 'icon--rotate-180'}`}
            aria-hidden
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="organization-log-panel__filters">
            <div className="filter-chip" aria-hidden>
              <FilterIcon className="icon" />
              <span>{t('logPanel.filterLabel')}</span>
            </div>

            {!hideEntityFilter && (
              <label className="form-field">
                <span className="form-label">{t('logPanel.filterEntity')}</span>
                <select
                  className="organization-log-panel__select"
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value as typeof entityFilter)}
                >
                  {ENTITY_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="form-field">
              <span className="form-label">{t('logPanel.filterAction')}</span>
              <select
                className="organization-log-panel__select"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)}
              >
                {ACTION_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading && <p className="section-subtitle">{t('logPanel.stateLoading')}</p>}

          {!isLoading && filteredLogs.length === 0 && (
            <p className="section-subtitle">{t('logPanel.stateEmpty')}</p>
          )}

          {!isLoading && filteredLogs.length > 0 && (
            <ul className="activity-log-list">
              {displayedLogs.map((log) => (
                <li key={log.id} className="activity-log-item">
                  <div className="activity-log-item__timeline" aria-hidden>
                    <span className={`activity-log-dot activity-log-dot--${log.action}`} />
                    <span className="activity-log-line" />
                  </div>

                  <div className="activity-log-item__content">
                    <div className="activity-log-tags">
                      <span className={`chip chip--${log.action}`}>
                        {renderActionLabel(log.action)}
                      </span>
                      <span className="chip chip--entity">{renderEntityLabel(log.entityType)}</span>
                    </div>
                    <p className="activity-log-message">{log.message}</p>
                    <p className="activity-log-meta">
                      <span className="activity-log-user">{log.actorName}</span>
                      <span aria-hidden>•</span>
                      <span>{formatLogDate(log.createdAt)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && filteredLogs.length > displayedLogs.length && (
            <div className="organization-log-panel__actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setVisibleCount((previous) => previous + INITIAL_LOG_PAGE_SIZE)}
              >
                {t('logPanel.listMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
