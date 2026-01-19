import { useEffect, useMemo, useState } from 'react';

import type { ActivityLog } from '../../domain/entities/activityLog';
import { logService } from '../../application/use-cases/LogUseCase';
import { useToast } from '../context/ToastContext';
import { ActivityIcon, ChevronDownIcon, FilterIcon } from './icons';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

interface OrganizationLogPanelProps {
  organizationId: string;
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

export const OrganizationLogPanel = ({ organizationId }: OrganizationLogPanelProps) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActivityLog['action'] | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<ActivityLog['entityType'] | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOG_PAGE_SIZE);
  const { t } = useTranslation();

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

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          (actionFilter === 'all' || log.action === actionFilter) &&
          (entityFilter === 'all' || log.entityType === entityFilter),
      ),
    [actionFilter, entityFilter, logs],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_LOG_PAGE_SIZE);
  }, [actionFilter, entityFilter, logs]);

  const displayedLogs = useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount],
  );

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const renderLogMessage = (log: ActivityLog) => {
    if (!log.messageKey) {
      const legacyMessage = translateLegacyMessage(log.message);
      return legacyMessage;
    }

    const messageParams = log.messageParams ?? {};
    return t(log.messageKey, { ...messageParams, defaultValue: log.message });
  };

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

  const translateLegacyMessage = (message: string) => {
    const rules: Array<{
      regex: RegExp;
      key: string;
      buildParams: (match: RegExpMatchArray) => Record<string, string | number>;
    }> = [
      {
        regex: /^Organização criada: (.+)$/i,
        key: 'logMessages.organization.created',
        buildParams: ([, organizationName]) => ({ organizationName }),
      },
      {
        regex: /^Organização atualizada: (.+)$/i,
        key: 'logMessages.organization.updated',
        buildParams: ([, organizationName]) => ({ organizationName }),
      },
      {
        regex: /^Organização removida: (.+)$/i,
        key: 'logMessages.organization.deleted',
        buildParams: ([, organizationName]) => ({ organizationName }),
      },
      {
        regex: /^Membro adicionado: (.+) em (.+)$/i,
        key: 'logMessages.organization.memberAdded',
        buildParams: ([, memberName, organizationName]) => ({ memberName, organizationName }),
      },
      {
        regex: /^Membro removido: (.+) de (.+)$/i,
        key: 'logMessages.organization.memberRemoved',
        buildParams: ([, memberName, organizationName]) => ({ memberName, organizationName }),
      },
      {
        regex: /^Membro adicionado automaticamente: (.+)$/i,
        key: 'logMessages.organization.memberAutoAdded',
        buildParams: ([, memberName]) => ({ memberName }),
      },
      {
        regex: /^Loja criada: (.+)$/i,
        key: 'logMessages.store.created',
        buildParams: ([, storeName]) => ({ storeName }),
      },
      {
        regex: /^Loja atualizada: (.+)$/i,
        key: 'logMessages.store.updated',
        buildParams: ([, storeName]) => ({ storeName }),
      },
      {
        regex: /^Loja removida: (.+)$/i,
        key: 'logMessages.store.deleted',
        buildParams: ([, storeName]) => ({ storeName }),
      },
      {
        regex: /^Cenário criado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.scenario.created',
        buildParams: ([, scenarioTitle, storeName]) => ({ scenarioTitle, storeName }),
      },
      {
        regex: /^Cenário atualizado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.scenario.updated',
        buildParams: ([, scenarioTitle, storeName]) => ({ scenarioTitle, storeName }),
      },
      {
        regex: /^Cenário removido: (.+) \\((.+)\\)$/i,
        key: 'logMessages.scenario.deleted',
        buildParams: ([, scenarioTitle, storeName]) => ({ scenarioTitle, storeName }),
      },
      {
        regex: /^Suíte criada: (.+) \\((.+)\\)$/i,
        key: 'logMessages.suite.created',
        buildParams: ([, suiteName, storeName]) => ({ suiteName, storeName }),
      },
      {
        regex: /^Suíte atualizada: (.+) \\((.+)\\)$/i,
        key: 'logMessages.suite.updated',
        buildParams: ([, suiteName, storeName]) => ({ suiteName, storeName }),
      },
      {
        regex: /^Suíte removida: (.+) \\((.+)\\)$/i,
        key: 'logMessages.suite.deleted',
        buildParams: ([, suiteName, storeName]) => ({ suiteName, storeName }),
      },
      {
        regex: /^Ambiente criado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.created',
        buildParams: ([, environmentId, storeName]) => ({ environmentId, storeName }),
      },
      {
        regex: /^Ambiente atualizado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.updated',
        buildParams: ([, environmentId, storeName]) => ({ environmentId, storeName }),
      },
      {
        regex: /^Ambiente removido: (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.deleted',
        buildParams: ([, environmentId, storeName]) => ({ environmentId, storeName }),
      },
      {
        regex: /^Participante adicionado ao ambiente \\((.+)\\) \\((.+)\\)$/i,
        key: 'logMessages.environment.participantAdded',
        buildParams: ([, environmentId, storeName]) => ({ environmentId, storeName }),
      },
      {
        regex: /^Participante removido do ambiente \\((.+)\\) \\((.+)\\)$/i,
        key: 'logMessages.environment.participantRemoved',
        buildParams: ([, environmentId, storeName]) => ({ environmentId, storeName }),
      },
      {
        regex: /^Status do cenário atualizado \\(mobile\\): (.+) - (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.scenarioStatusUpdatedMobile',
        buildParams: ([, status, environmentId, storeName]) => ({
          status,
          environmentId,
          storeName,
        }),
      },
      {
        regex: /^Status do cenário atualizado \\(desktop\\): (.+) - (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.scenarioStatusUpdatedDesktop',
        buildParams: ([, status, environmentId, storeName]) => ({
          status,
          environmentId,
          storeName,
        }),
      },
      {
        regex: /^Status do cenário atualizado: (.+) - (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.scenarioStatusUpdated',
        buildParams: ([, status, environmentId, storeName]) => ({ status, environmentId, storeName }),
      },
      {
        regex: /^Evidência vinculada ao cenário (.+) - (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.scenarioEvidenceAdded',
        buildParams: ([, scenarioId, environmentId, storeName]) => ({
          scenarioId,
          environmentId,
          storeName,
        }),
      },
      {
        regex: /^Bug criado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.bugCreated',
        buildParams: ([, bugTitle, storeName]) => ({ bugTitle, storeName }),
      },
      {
        regex: /^Bug atualizado: (.+) \\((.+)\\)$/i,
        key: 'logMessages.environment.bugUpdated',
        buildParams: ([, bugTitle, storeName]) => ({ bugTitle, storeName }),
      },
      {
        regex: /^Bug removido \\((.+)\\) \\((.+)\\)$/i,
        key: 'logMessages.environment.bugDeleted',
        buildParams: ([, bugId, storeName]) => ({ bugId, storeName }),
      },
      {
        regex: /^Status do ambiente atualizado para (.+) \\((.+)\\) \\((.+)\\)$/i,
        key: 'logMessages.environment.statusUpdated',
        buildParams: ([, status, environmentId, storeName]) => ({
          status,
          environmentId,
          storeName,
        }),
      },
    ];

    const matched = rules.find((rule) => rule.regex.test(message));
    if (!matched) {
      return message;
    }

    const match = message.match(matched.regex);
    if (!match) {
      return message;
    }

    const params = matched.buildParams(match);
    return t(matched.key, { ...params, defaultValue: message });
  };

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
                {logs.length} {t('logPanel.headerRecords')}
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
                    <p className="activity-log-message">{renderLogMessage(log)}</p>
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
