import { useState } from 'react';

import type { Environment } from '../../../domain/entities/environment';
import type { EnvironmentBug } from '../../../domain/entities/environment';
import { environmentService } from '../../../application/use-cases/EnvironmentUseCase';
import { useToast } from '../../context/ToastContext';
import { BUG_STATUS_LABEL } from '../../../shared/config/environmentLabels';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { SkeletonBlock } from '../SkeletonBlock';
import { Button } from '../Button';

interface EnvironmentBugListProps {
  environment: Environment;
  bugs: EnvironmentBug[];
  isLocked?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onEdit: (bug: EnvironmentBug) => void;
  showActions?: boolean;
  showHeader?: boolean;
  onUpdated?: () => void | Promise<void>;
  onRetry?: () => void;
}

export const EnvironmentBugList = ({
  environment,
  bugs,
  isLocked,
  isLoading,
  error,
  onEdit,
  showActions = true,
  showHeader = true,
  onUpdated,
  onRetry,
}: EnvironmentBugListProps) => {
  const { showToast } = useToast();
  const { t: translation } = useTranslation();

  const isReadOnly = Boolean(isLocked);
  const [bugToDelete, setBugToDelete] = useState<EnvironmentBug | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDelete = async (bug: EnvironmentBug) => {
    if (isReadOnly) {
      return;
    }

    try {
      setIsConfirmingDelete(true);
      await environmentService.deleteBug(environment.id, bug.id);
      showToast({
        type: 'success',
        message: translation('environmentBugList.bugRemovedSuccess'),
      });
      await onUpdated?.();
    } catch (error) {
      void error;
      showToast({
        type: 'error',
        message: translation('environmentBugList.bugRemovedError'),
      });
    } finally {
      setIsConfirmingDelete(false);
      setBugToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!bugToDelete) {
      return;
    }

    await handleDelete(bugToDelete);
  };

  const closeDeleteModal = () => {
    if (isConfirmingDelete) {
      return;
    }

    setBugToDelete(null);
  };

  const getScenarioLabel = (scenarioId: string | null) => {
    if (!scenarioId) {
      return translation('environmentBugList.notLinked');
    }

    return (
      environment.scenarios?.[scenarioId]?.titulo ||
      translation('environmentBugList.scenarioRemoved')
    );
  };

  return (
    <div className="environment-bugs">
      {showHeader && (
        <div className="environment-bugs__header">
          <h3 className="section-title">{translation('environmentBugList.bugRegistry')}</h3>
        </div>
      )}

      {isLoading ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>{translation('environmentBugList.title')}</th>
              <th>{translation('environmentBugList.status')}</th>
              <th>{translation('environmentBugList.scenario')}</th>
              <th>{translation('environmentBugList.description')}</th>
              {showActions && <th>{translation('environmentBugList.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, index) => (
              <tr key={`bug-skeleton-${index}`}>
                <td>
                  <SkeletonBlock style={{ width: '70%', height: '1rem' }} />
                </td>
                <td>
                  <SkeletonBlock style={{ width: '50%', height: '1rem' }} />
                </td>
                <td>
                  <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
                </td>
                <td>
                  <SkeletonBlock style={{ width: '90%', height: '1rem' }} />
                </td>
                {showActions && (
                  <td>
                    <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : error ? (
        <ErrorState
          title={translation('environmentBugList.loadError')}
          description={translation('environmentBugList.loadErrorDescription')}
          actionLabel={translation('retry')}
          onRetry={onRetry}
        />
      ) : bugs.length === 0 ? (
        <EmptyState
          title={translation('environmentBugList.noBugs')}
          description={translation('environmentBugList.noBugsDescription')}
          action={
            onRetry ? (
              <Button type="button" variant="secondary" onClick={onRetry}>
                {translation('retry')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{translation('environmentBugList.title')}</th>
              <th>{translation('environmentBugList.status')}</th>
              <th>{translation('environmentBugList.scenario')}</th>
              <th>{translation('environmentBugList.description')}</th>
              {showActions && <th>{translation('environmentBugList.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug) => (
              <tr key={bug.id}>
                <td>{bug.title}</td>
                <td>
                  <span className={`bug-status bug-status--${bug.status}`}>
                    {translation(BUG_STATUS_LABEL[bug.status])}
                  </span>
                </td>
                <td>{getScenarioLabel(bug.scenarioId)}</td>
                <td>{bug.description || translation('environmentBugList.noDescription')}</td>
                {showActions && (
                  <td className="environment-bugs__actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onEdit(bug)}
                      disabled={isReadOnly}
                    >
                      {translation('environmentBugList.edit')}
                    </button>
                    <button
                      type="button"
                      className="link-button link-button--danger"
                      onClick={() => setBugToDelete(bug)}
                      disabled={isReadOnly}
                    >
                      {translation('environmentBugList.remove')}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ConfirmDeleteModal
        isOpen={Boolean(bugToDelete)}
        message={
          bugToDelete
            ? translation('environmentBugList.confirmDeleteWithName', { title: bugToDelete.title })
            : translation('environmentBugList.confirmDelete')
        }
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        isConfirming={isConfirmingDelete}
      />
    </div>
  );
};
