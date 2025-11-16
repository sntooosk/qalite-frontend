import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In progress',
  done: 'Done',
};

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);
  const suiteDescription = environment?.suiteName ?? 'Suite not provided';

  if (isLoading) {
    return (
      <Layout>
        <section className="page-container">
          <p className="section-subtitle">Loading public environment...</p>
        </section>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container">
          <h1 className="section-title">Environment not found</h1>
          <p className="section-subtitle">Verify the shared link and try again.</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-page__header">
          <div className="environment-page__title">
            <span className={`status-pill status-pill--${environment.status}`}>
              {STATUS_LABEL[environment.status]}
            </span>
            <h1 className="section-title">{environment.identifier}</h1>
            <p className="section-subtitle">
              {environment.environmentType} · {environment.testType} · {suiteDescription}
            </p>
          </div>
        </div>

        <div className="environment-summary-grid">
          <div className="summary-card">
            <h3>Summary</h3>
            <p>
              <strong>Status:</strong> {STATUS_LABEL[environment.status]}
            </p>
            <p>
              <strong>Total time:</strong> {formattedTime}
            </p>
            <p>
              <strong>Jira:</strong> {environment.jiraTask || 'Not provided'}
            </p>
            <p>
              <strong>Suite:</strong> {suiteDescription}
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
            <h3>Participants</h3>
            {participants.length === 0 ? (
              <p className="section-subtitle">No participants were registered.</p>
            ) : (
              <ul className="environment-present-users">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    {participant.photoURL ? (
                      <img src={participant.photoURL} alt={participant.name} />
                    ) : (
                      <span className="environment-card-avatar environment-card-avatar--initials">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{participant.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="environment-evidence">
          <h3 className="section-subtitle">Scenarios and evidence</h3>
          <EnvironmentEvidenceTable environment={environment} isLocked readOnly />
        </div>
      </section>
    </Layout>
  );
};
