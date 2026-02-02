import type { DragEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { Environment } from '../../../domain/entities/environment';
import type { UserSummary } from '../../../domain/entities/user';
import { getReadableUserName, getUserInitials } from '../../utils/userDisplay';
import { ENVIRONMENT_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { translateEnvironmentOption } from '../../constants/environmentOptions';
import { BugIcon, ClockIcon, CopyIcon, ListIcon, LayersIcon, UsersIcon } from '../icons';

interface EnvironmentCardProps {
  environment: Environment;
  participants: UserSummary[];
  suiteName?: string | null;
  bugCount?: number;
  onOpen: (environment: Environment) => void;
  onClone?: (environment: Environment) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>, environmentId: string) => void;
}

export const EnvironmentCard = ({
  environment,
  participants,
  suiteName,
  bugCount,
  onOpen,
  onClone,
  draggable = false,
  onDragStart,
}: EnvironmentCardProps) => {
  const { t } = useTranslation();
  const isLocked = environment.status === 'done';
  const displaySuiteName = suiteName ?? t('environmentCard.displaySuiteName');
  const hasParticipants = participants.length > 0;
  const visibleParticipants = participants.slice(0, 3);
  const hiddenParticipantsCount = Math.max(participants.length - visibleParticipants.length, 0);
  const bugLabel =
    environment.tipoAmbiente?.toUpperCase() === 'WS'
      ? t('environmentCard.bugStoryfix')
      : t('environmentCard.bugBugs');
  const totalScenariosWithPlatforms = environment.totalCenarios * 2;
  const momentLabel = translateEnvironmentOption(environment.momento, t);
  const displayBugCount = bugCount ?? environment.bugs ?? 0;

  const handleOpen = () => onOpen(environment);
  const handleClone = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClone?.(environment);
  };

  return (
    <div
      className={`environment-card ${isLocked ? 'is-locked' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      draggable={draggable && !isLocked}
      onDragStart={(event) => onDragStart?.(event, environment.id)}
      data-status={environment.status}
    >
      <div className="environment-card-header">
        <div className="environment-card-title">
          <span className="environment-card-identifier">{environment.identificador}</span>
          <span className="environment-card-type">{t(environment.tipoTeste)}</span>
        </div>
        <div className="environment-card-actions">
          <span
            className={`environment-card-status-dot environment-card-status-dot--${environment.status}`}
          >
            {t(ENVIRONMENT_STATUS_LABEL[environment.status])}
          </span>
          {onClone && (
            <button
              type="button"
              className="environment-card-action"
              onClick={handleClone}
              onMouseDown={(event) => event.stopPropagation()}
              aria-label={t('environmentCard.clone')}
            >
              <CopyIcon aria-hidden className="icon" />
              <span>{t('environmentCard.clone')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="environment-card-suite-row">
        <div className="environment-card-row-title">
          <LayersIcon aria-hidden className="icon" />
          <span className="environment-card-suite-label">{t('environmentCard.suiteLabel')}</span>
        </div>
        <span className="environment-card-suite-name">{displaySuiteName}</span>
      </div>

      {environment.momento && (
        <div className="environment-card-moment-row">
          <div className="environment-card-row-title">
            <ClockIcon aria-hidden className="icon" />
            <span className="environment-card-moment-label">
              {t('environmentCard.momentLabel')}
            </span>
          </div>
          <span className="environment-card-moment-name">{momentLabel}</span>
        </div>
      )}

      <div className="environment-card-stats">
        <div className="environment-card-stat">
          <span className="environment-card-stat-label">
            <ListIcon aria-hidden className="icon" />
            {t('scenarios')}
          </span>
          <strong className="environment-card-stat-value">{totalScenariosWithPlatforms}</strong>
        </div>
        <div className="environment-card-stat">
          <span className="environment-card-stat-label">
            <BugIcon aria-hidden className="icon" />
            {bugLabel}
          </span>
          <strong className="environment-card-stat-value">{displayBugCount}</strong>
        </div>
      </div>

      <div
        className="environment-card-participants"
        aria-label={t('environmentCard.participantsLabel')}
      >
        {hasParticipants ? (
          <>
            <ul
              className="environment-card-participant-list"
              aria-label={t('environmentCard.participantsListLabel')}
            >
              {visibleParticipants.map((user) => {
                const readableName = getReadableUserName(user);
                const initials = getUserInitials(readableName);
                return (
                  <li key={user.id} className="environment-card-participant" title={readableName}>
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={readableName}
                        className="environment-card-avatar"
                      />
                    ) : (
                      <span
                        className="environment-card-avatar environment-card-avatar--initials"
                        aria-label={readableName}
                      >
                        {initials}
                      </span>
                    )}
                  </li>
                );
              })}
              {hiddenParticipantsCount > 0 && (
                <li className="environment-card-participant environment-card-participant--more">
                  +{hiddenParticipantsCount}
                </li>
              )}
            </ul>
            <span className="environment-card-participants-label">
              <UsersIcon aria-hidden className="icon" />
              {t('environmentCard.participant', { count: participants.length })}
            </span>
          </>
        ) : (
          <span className="environment-card-avatars__placeholder">
            <UsersIcon aria-hidden className="icon" />
            {t('environmentCard.noParticipants')}
          </span>
        )}
      </div>
    </div>
  );
};
