import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment, EnvironmentBug } from '../../../domain/entities/environment';
import {
  BUG_PRIORITY_LABEL,
  BUG_SEVERITY_LABEL,
  BUG_STATUS_LABEL,
} from '../../../shared/config/environmentLabels';
import { Modal } from '../Modal';

interface EnvironmentBugDetailsModalProps {
  isOpen: boolean;
  bug: EnvironmentBug | null;
  environment: Environment;
  onClose: () => void;
}

export const EnvironmentBugDetailsModal = ({
  isOpen,
  bug,
  environment,
  onClose,
}: EnvironmentBugDetailsModalProps) => {
  const { t } = useTranslation();

  const scenarioLabel = useMemo(() => {
    if (!bug?.scenarioId) {
      return t('environmentBugList.notLinked');
    }

    return (
      environment.scenarios?.[bug.scenarioId]?.titulo || t('environmentBugList.scenarioRemoved')
    );
  }, [bug?.scenarioId, environment.scenarios, t]);

  if (!bug) {
    return null;
  }

  const statusLabel = t(BUG_STATUS_LABEL[bug.status]);
  const severityLabel = bug.severity
    ? t(BUG_SEVERITY_LABEL[bug.severity])
    : t('environmentBugDetails.emptyValue');
  const priorityLabel = bug.priority
    ? t(BUG_PRIORITY_LABEL[bug.priority])
    : t('environmentBugDetails.emptyValue');
  const reportedBy = bug.reportedBy?.trim() || t('environmentBugDetails.emptyValue');
  const description = bug.description?.trim() || t('environmentBugDetails.noDescription');
  const stepsToReproduce = bug.stepsToReproduce?.trim() || t('environmentBugDetails.noSteps');
  const expectedResult = bug.expectedResult?.trim() || t('environmentBugDetails.noExpectedResult');
  const actualResult = bug.actualResult?.trim() || t('environmentBugDetails.noActualResult');

  return (
    <Modal
      isOpen={isOpen}
      title={t('environmentBugDetails.title')}
      description={bug.title}
      onClose={onClose}
    >
      <div className="bug-details">
        <div className="bug-details__grid">
          <div>
            <span className="bug-details__label">{t('environmentBugDetails.status')}</span>
            <span className="bug-details__value">
              <span className={`bug-status bug-status--${bug.status}`}>{statusLabel}</span>
            </span>
          </div>
          <div>
            <span className="bug-details__label">{t('environmentBugDetails.severity')}</span>
            <span className="bug-details__value">
              <span className={`bug-severity bug-severity--${bug.severity ?? 'unknown'}`}>
                {severityLabel}
              </span>
            </span>
          </div>
          <div>
            <span className="bug-details__label">{t('environmentBugDetails.priority')}</span>
            <span className="bug-details__value">
              <span className={`bug-priority bug-priority--${bug.priority ?? 'unknown'}`}>
                {priorityLabel}
              </span>
            </span>
          </div>
          <div>
            <span className="bug-details__label">{t('environmentBugDetails.reportedBy')}</span>
            <span className="bug-details__value">{reportedBy}</span>
          </div>
          <div>
            <span className="bug-details__label">{t('environmentBugDetails.scenario')}</span>
            <span className="bug-details__value">{scenarioLabel}</span>
          </div>
        </div>
        <dl className="bug-details__list">
          <div>
            <dt>{t('environmentBugDetails.titleLabel')}</dt>
            <dd>{bug.title}</dd>
          </div>
          <div>
            <dt>{t('environmentBugDetails.description')}</dt>
            <dd>{description}</dd>
          </div>
          <div>
            <dt>{t('environmentBugDetails.steps')}</dt>
            <dd>{stepsToReproduce}</dd>
          </div>
          <div>
            <dt>{t('environmentBugDetails.expectedResult')}</dt>
            <dd>{expectedResult}</dd>
          </div>
          <div>
            <dt>{t('environmentBugDetails.actualResult')}</dt>
            <dd>{actualResult}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
};
