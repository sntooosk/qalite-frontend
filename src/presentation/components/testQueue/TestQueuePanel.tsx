import { FormEvent, useMemo, useState } from 'react';

import type { Store } from '../../../domain/entities/store';
import type { TestQueueExecution } from '../../../domain/entities/testQueue';
import { useTestQueue } from '../../hooks/useTestQueue';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { SelectInput } from '../SelectInput';
import { TextInput } from '../TextInput';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';

interface TestQueuePanelProps {
  stores: Store[];
}

const formatRelativeTime = (isoDate: string | null, locale: string): string => {
  if (!isoDate) {
    return '-';
  }

  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) {
    return '-';
  }

  const diffMs = Date.now() - time;
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 1) {
    return rtf.format(0, 'minute');
  }
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(-diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(-diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(-diffDays, 'day');
};

const formatExecutionLabel = (execution: TestQueueExecution): string =>
  `${execution.projectName ?? ''} ${execution.environment}`.trim();

export const TestQueuePanel = ({ stores }: TestQueuePanelProps) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { executions, capacity, isLoading, createExecution } = useTestQueue();
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '');
  const [environment, setEnvironment] = useState('');
  const [testType, setTestType] = useState('smoke');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runningExecutions = useMemo(
    () => executions.filter((execution) => execution.status === 'running'),
    [executions],
  );
  const waitingExecutions = useMemo(
    () => executions.filter((execution) => execution.status === 'waiting'),
    [executions],
  );

  const userQueuePosition = useMemo(() => {
    if (!user) {
      return null;
    }

    const index = waitingExecutions.findIndex(
      (execution) => execution.requestedBy.uid === user.uid,
    );
    return index >= 0 ? index + 1 : null;
  }, [user, waitingExecutions]);

  const storeOptions = useMemo(
    () => [
      { value: '', label: t('testQueue.selectProject') },
      ...stores.map((store) => ({ value: store.id, label: store.name })),
    ],
    [stores, t],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedStoreId) {
      setFormError(t('testQueue.errorProject'));
      return;
    }

    if (!environment.trim()) {
      setFormError(t('testQueue.errorEnvironment'));
      return;
    }

    const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
    if (!selectedStore) {
      setFormError(t('testQueue.errorProject'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createExecution({
        testType,
        environment: environment.trim(),
        projectId: selectedStore.id,
        projectName: selectedStore.name,
      });
      setEnvironment('');
      setTestType('smoke');
      showToast({ type: 'success', message: t('testQueue.success') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('testQueue.errorCreate');
      setFormError(message);
      showToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card test-queue-panel">
      <header className="test-queue-panel__header">
        <div>
          <span className="badge">{t('testQueue.badge')}</span>
          <h2 className="section-title">{t('testQueue.title')}</h2>
          <p className="section-subtitle">{t('testQueue.subtitle')}</p>
        </div>
        <div className="test-queue-panel__summary">
          <div>
            <strong>{capacity.runningCount}</strong>
            <span>{t('testQueue.running')}</span>
          </div>
          <div>
            <strong>{waitingExecutions.length}</strong>
            <span>{t('testQueue.waiting')}</span>
          </div>
          <div>
            <strong>{capacity.maxParallel}</strong>
            <span>{t('testQueue.capacity')}</span>
          </div>
        </div>
      </header>

      {userQueuePosition && (
        <div className="test-queue-panel__position">
          <strong>{t('testQueue.position', { position: userQueuePosition })}</strong>
        </div>
      )}

      <div className="test-queue-panel__grid">
        <div className="test-queue-panel__form">
          {formError && <Alert type="error" message={formError} />}

          <form onSubmit={handleSubmit}>
            <SelectInput
              id="queue-project"
              label={t('testQueue.project')}
              value={selectedStoreId}
              options={storeOptions}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              required
            />
            <TextInput
              id="queue-environment"
              label={t('testQueue.environment')}
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              placeholder="staging, homolog, prod"
              required
            />
            <SelectInput
              id="queue-test-type"
              label={t('testQueue.testType')}
              value={testType}
              options={[
                { value: 'smoke', label: t('testQueue.testTypeSmoke') },
                { value: 'regression', label: t('testQueue.testTypeRegression') },
                { value: 'full', label: t('testQueue.testTypeFull') },
              ]}
              onChange={(event) => setTestType(event.target.value)}
              required
            />
            <Button type="submit" isLoading={isSubmitting} loadingText={t('testQueue.submitting')}>
              {t('testQueue.submit')}
            </Button>
          </form>
        </div>

        <div className="test-queue-panel__lists">
          <div className="test-queue-panel__list">
            <h3>{t('testQueue.runningNow')}</h3>
            {isLoading ? (
              <p className="section-subtitle">{t('testQueue.loading')}</p>
            ) : runningExecutions.length === 0 ? (
              <p className="section-subtitle">{t('testQueue.emptyRunning')}</p>
            ) : (
              <ul>
                {runningExecutions.map((execution) => (
                  <li key={execution.id}>
                    <strong>{formatExecutionLabel(execution)}</strong>
                    <span>
                      {t('testQueue.requestedBy', { name: execution.requestedBy.displayName })}
                    </span>
                    <span>
                      {t('testQueue.startedAt', {
                        time: formatRelativeTime(execution.startedAt, i18n.language),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="test-queue-panel__list">
            <h3>{t('testQueue.waitingList')}</h3>
            {isLoading ? (
              <p className="section-subtitle">{t('testQueue.loading')}</p>
            ) : waitingExecutions.length === 0 ? (
              <p className="section-subtitle">{t('testQueue.emptyWaiting')}</p>
            ) : (
              <ol>
                {waitingExecutions.map((execution) => (
                  <li key={execution.id}>
                    <strong>{formatExecutionLabel(execution)}</strong>
                    <span>
                      {t('testQueue.requestedBy', { name: execution.requestedBy.displayName })}
                    </span>
                    <span>
                      {t('testQueue.createdAt', {
                        time: formatRelativeTime(execution.createdAt, i18n.language),
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
