import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type {
  EnvironmentBug,
  EnvironmentBugPriority,
  EnvironmentBugSeverity,
  EnvironmentBugStatus,
} from '../../../domain/entities/environment';
import { environmentService } from '../../../infrastructure/services/environmentService';
import { useToast } from '../../context/ToastContext';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useAuth } from '../../hooks/useAuth';

interface EnvironmentBugModalProps {
  environment: Environment;
  isOpen: boolean;
  bug: EnvironmentBug | null;
  onClose: () => void;
  onSaved?: () => void;
  initialScenarioId?: string | null;
}

const STATUS_OPTIONS: { value: EnvironmentBugStatus; label: string }[] = [
  { value: 'aberto', label: 'environmentBugModal.open' },
  { value: 'em_andamento', label: 'environmentBugModal.progress' },
  { value: 'resolvido', label: 'environmentBugModal.resolved' },
];

const SEVERITY_OPTIONS: { value: EnvironmentBugSeverity; label: string }[] = [
  { value: 'baixa', label: 'environmentBugSeverity.low' },
  { value: 'media', label: 'environmentBugSeverity.medium' },
  { value: 'alta', label: 'environmentBugSeverity.high' },
  { value: 'critica', label: 'environmentBugSeverity.critical' },
];

const PRIORITY_OPTIONS: { value: EnvironmentBugPriority; label: string }[] = [
  { value: 'baixa', label: 'environmentBugPriority.low' },
  { value: 'media', label: 'environmentBugPriority.medium' },
  { value: 'alta', label: 'environmentBugPriority.high' },
  { value: 'urgente', label: 'environmentBugPriority.urgent' },
];

export const EnvironmentBugModal = ({
  environment,
  isOpen,
  bug,
  onClose,
  onSaved,
  initialScenarioId,
}: EnvironmentBugModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [status, setStatus] = useState<EnvironmentBugStatus>('aberto');
  const [severity, setSeverity] = useState<EnvironmentBugSeverity>('media');
  const [priority, setPriority] = useState<EnvironmentBugPriority>('media');
  const [reportedBy, setReportedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarioLabel = useMemo(() => {
    if (!scenarioId) {
      return t('environmentBugModal.noScenario');
    }

    return environment.scenarios?.[scenarioId]?.titulo ?? t('environmentBugModal.deletedScenario');
  }, [environment.scenarios, scenarioId, t]);

  useEffect(() => {
    if (bug) {
      setTitle(bug.title);
      setDescription(bug.description ?? '');
      setStepsToReproduce(bug.stepsToReproduce ?? '');
      setExpectedResult(bug.expectedResult ?? '');
      setActualResult(bug.actualResult ?? '');
      setScenarioId(bug.scenarioId ?? '');
      setStatus(bug.status);
      setSeverity(bug.severity ?? 'media');
      setPriority(bug.priority ?? 'media');
      setReportedBy(
        bug.reportedBy ??
          user?.displayName ??
          user?.email ??
          t('environmentBugModal.reportedByFallback'),
      );
      return;
    }

    setTitle('');
    setDescription('');
    setStepsToReproduce('');
    setExpectedResult('');
    setActualResult('');
    setScenarioId(initialScenarioId ?? '');
    setStatus('aberto');
    setSeverity('media');
    setPriority('media');
    setReportedBy(user?.displayName ?? user?.email ?? t('environmentBugModal.reportedByFallback'));
  }, [bug, initialScenarioId, isOpen, t, user?.displayName, user?.email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!environment.id) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      scenarioId: scenarioId || null,
      status,
      severity,
      priority,
      reportedBy: reportedBy.trim() || null,
      stepsToReproduce: stepsToReproduce.trim() || null,
      expectedResult: expectedResult.trim() || null,
      actualResult: actualResult.trim() || null,
    };

    try {
      if (bug) {
        await environmentService.updateBug(environment.id, bug.id, payload);
        showToast({ type: 'success', message: t('environmentBugModal.bugUpdated') });
      } else {
        await environmentService.createBug(environment.id, payload);
        showToast({ type: 'success', message: t('environmentBugModal.bugRegister') });
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: t('environmentBugModal.bugUnsaved') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={bug ? t('environmentBugModal.bugEdit') : t('environmentBugModal.bugCreate')}
      onClose={onClose}
    >
      <form className="environment-bug-form" onSubmit={handleSubmit}>
        <div className="environment-bug-form__grid">
          <label>
            <span>{t('environmentBugModal.related')}</span>
            <input type="text" value={scenarioLabel} readOnly disabled />
          </label>
          <label>
            <span>{t('environmentBugModal.status')}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as EnvironmentBugStatus)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('environmentBugModal.severity')}</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as EnvironmentBugSeverity)}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('environmentBugModal.priority')}</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as EnvironmentBugPriority)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('environmentBugModal.reportedBy')}</span>
            <input type="text" value={reportedBy} readOnly disabled />
          </label>
        </div>
        <label>
          <span>{t('environmentBugModal.title')}</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder={t('environmentBugModal.problem')}
          />
        </label>
        <label>
          <span>{t('environmentBugModal.description')}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('environmentBugModal.bugDescription')}
          />
        </label>
        <label>
          <span>{t('environmentBugModal.steps')}</span>
          <textarea
            value={stepsToReproduce}
            onChange={(event) => setStepsToReproduce(event.target.value)}
            placeholder={t('environmentBugModal.stepsPlaceholder')}
          />
        </label>
        <label>
          <span>{t('environmentBugModal.expectedResult')}</span>
          <textarea
            value={expectedResult}
            onChange={(event) => setExpectedResult(event.target.value)}
            placeholder={t('environmentBugModal.expectedPlaceholder')}
          />
        </label>
        <label>
          <span>{t('environmentBugModal.actualResult')}</span>
          <textarea
            value={actualResult}
            onChange={(event) => setActualResult(event.target.value)}
            placeholder={t('environmentBugModal.actualPlaceholder')}
          />
        </label>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText={t('saving')}
          >
            {bug ? t('saveChanges') : t('environmentBugModal.bugCreate')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
