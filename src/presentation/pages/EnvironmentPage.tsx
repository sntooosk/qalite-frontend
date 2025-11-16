import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EnvironmentStatusError } from '../../application/errors/EnvironmentStatusError';
import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { usePresentUsers } from '../hooks/usePresentUsers';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useAuth } from '../hooks/useAuth';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EditEnvironmentModal } from '../components/environments/EditEnvironmentModal';
import { DeleteEnvironmentModal } from '../components/environments/DeleteEnvironmentModal';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { copyToClipboard } from '../utils/clipboard';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  done: 'Done',
};

export const EnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isLocked = environment?.status === 'done';
  const isScenarioLocked = environment?.status !== 'in_progress';

  const { presentUsers } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked),
  });

  const participantProfiles = useUserProfiles(environment?.participants ?? []);

  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);
  const suiteDescription = environment?.suiteName ?? 'Suite not provided';

  const scenarioStats = useMemo(() => {
    if (!environment) {
      return { total: 0, concluded: 0, pending: 0, running: 0 };
    }

    const scenarios = Object.values(environment.scenarios ?? {});
    const concluded = scenarios.filter((scenario) =>
      ['done', 'automated_done', 'not_applicable'].includes(scenario.status),
    ).length;
    const pending = scenarios.filter((scenario) => scenario.status === 'pending').length;
    const running = scenarios.filter((scenario) => scenario.status === 'in_progress').length;
    return { total: scenarios.length, concluded, pending, running };
  }, [environment]);

  const handleStatusTransition = async (target: EnvironmentStatus) => {
    if (!environment) {
      return;
    }

    try {
      await environmentService.transitionStatus({
        environment,
        targetStatus: target,
        currentUserId: user?.uid ?? null,
      });

      showToast({
        type: 'success',
        message: target === 'done' ? 'Environment finished.' : 'Status updated successfully.',
      });
    } catch (error) {
      if (error instanceof EnvironmentStatusError && error.code === 'PENDING_SCENARIOS') {
        showToast({
          type: 'error',
          message: 'There are pending scenarios. Finish them before closing the environment.',
        });
        return;
      }

      console.error(error);
      showToast({ type: 'error', message: 'Unable to update the status.' });
    }
  };

  const handleCopyLink = async (url: string) => {
    if (!url) {
      return;
    }

    try {
      await copyToClipboard(url);
      showToast({ type: 'success', message: 'Link copied to the clipboard.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Unable to copy the link.' });
    }
  };

  const handleExportPDF = () => {
    if (!environment) {
      return;
    }
    environmentService.exportAsPDF(environment);
  };

  const handleExportMarkdown = () => {
    if (!environment) {
      return;
    }
    environmentService.exportAsMarkdown(environment);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const privateLink = environment ? `${origin}/environments/${environment.id}` : '';
  const publicLink = environment ? `${origin}/environments/${environment.id}/public` : '';

  return (
    <Layout>
      <section className="page-container environment-page">
        <div className="environment-page__header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Back
            </button>
            <div className="environment-page__title">
              {environment && (
                <span className={`status-pill status-pill--${environment.status}`}>
                  {STATUS_LABEL[environment.status]}
                </span>
              )}
              <h1 className="section-title">{environment?.identifier ?? 'Environment'}</h1>
              {environment && (
                <p className="section-subtitle">
                  {environment.environmentType} · {environment.testType} · {suiteDescription}
                </p>
              )}
            </div>
          </div>
          {!isLoading && environment && (
            <div className="environment-actions">
              {environment.status === 'backlog' && (
                <Button type="button" onClick={() => handleStatusTransition('in_progress')}>
                  Start execution
                </Button>
              )}
              {environment.status === 'in_progress' && (
                <Button type="button" onClick={() => handleStatusTransition('done')}>
                  Finish environment
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {isLoading && <p className="section-subtitle">Loading environment data...</p>}

        {!isLoading && environment && (
          <>
            <div className="environment-summary-grid">
              <div className="summary-card">
                <h3>Environment overview</h3>
                <div className="summary-card__metrics">
                  <div>
                    <span>Total scenarios</span>
                    <strong>{scenarioStats.total}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{scenarioStats.concluded}</strong>
                  </div>
                  <div>
                    <span>In progress</span>
                    <strong>{scenarioStats.running}</strong>
                  </div>
                  <div>
                    <span>Pending</span>
                    <strong>{scenarioStats.pending}</strong>
                  </div>
                </div>
                <p>
                  <strong>Total time:</strong> {formattedTime}
                </p>
                <p>
                  <strong>Jira:</strong> {environment.jiraTask || 'Not provided'}
                </p>
                <p>
                  <strong>Suite:</strong> {suiteDescription}
                </p>
                <p>
                  <strong>Bugs:</strong> {environment.bugs}
                </p>
              </div>
              <div className="summary-card">
                <h3>Tracked URLs</h3>
                {urls.length === 0 ? (
                  <p className="section-subtitle">No URLs were added.</p>
                ) : (
                  <ul className="environment-url-list">
                    {urls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="summary-card">
                <h3>Sharing and export</h3>
                <div className="share-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCopyLink(privateLink)}
                    disabled={isLocked}
                  >
                    Copy private link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleCopyLink(publicLink)}
                  >
                    Copy public link
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleExportPDF}>
                    Export PDF
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleExportMarkdown}>
                    Export Markdown
                  </Button>
                </div>
                {isLocked && (
                  <p className="section-subtitle">
                    Environment finished: sharing is blocked for new accesses.
                  </p>
                )}
              </div>
            </div>

            <div className="environment-participants">
              <div>
                <h3>Present users</h3>
                {presentUsers.length === 0 ? (
                  <p className="section-subtitle">No one is connected to this environment.</p>
                ) : (
                  <ul className="environment-present-users">
                    {presentUsers.map((user) => (
                      <li key={user.id}>
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{user.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Registered participants</h3>
                {participantProfiles.length === 0 ? (
                  <p className="section-subtitle">No participants were registered yet.</p>
                ) : (
                  <ul className="environment-present-users">
                    {participantProfiles.map((profile) => (
                      <li key={profile.id}>
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.name} />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{profile.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="environment-evidence">
              <div className="environment-evidence__header">
                <div>
                  <h3 className="section-subtitle">Scenarios and evidence</h3>
                  <p>Update the status and upload approved evidence.</p>
                </div>
                <a
                  href={`/environments/${environment.id}/public`}
                  className="link-button"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open public preview ↗
                </a>
              </div>
              <EnvironmentEvidenceTable
                environment={environment}
                isLocked={Boolean(isScenarioLocked)}
              />
            </div>
          </>
        )}
      </section>

      <EditEnvironmentModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        environment={environment ?? null}
      />
      <DeleteEnvironmentModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        environment={environment ?? null}
        onDeleted={() => navigate(-1)}
      />
    </Layout>
  );
};
