import type { ChangeEvent } from 'react';

import type { Environment, EnvironmentScenarioStatus } from '../../../domain/entities/Environment';
import { useScenarioEvidence } from '../../hooks/useScenarioEvidence';

interface EnvironmentEvidenceTableProps {
  environment: Environment;
  isLocked?: boolean;
  readOnly?: boolean;
}

const STATUS_OPTIONS: { value: EnvironmentScenarioStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'automated_done', label: 'Automated done' },
  { value: 'not_applicable', label: 'Not applicable' },
];

export const EnvironmentEvidenceTable = ({
  environment,
  isLocked,
  readOnly,
}: EnvironmentEvidenceTableProps) => {
  const { isUpdating, handleEvidenceUpload, changeScenarioStatus } = useScenarioEvidence(
    environment.id,
  );
  const scenarioEntries = Object.entries(environment.scenarios ?? {});
  const isReadOnly = Boolean(isLocked || readOnly);

  const handleStatusChange = async (scenarioId: string, status: EnvironmentScenarioStatus) => {
    if (isReadOnly) {
      return;
    }

    await changeScenarioStatus(scenarioId, status);
  };

  const handleFileChange = async (scenarioId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    await handleEvidenceUpload(scenarioId, file);
    event.target.value = '';
  };

  if (scenarioEntries.length === 0) {
    return <p className="section-subtitle">No scenarios are linked to this environment.</p>;
  }

  return (
    <div className="environment-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Criticality</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {scenarioEntries.map(([scenarioId, data]) => (
            <tr key={scenarioId}>
              <td>{data.title}</td>
              <td>{data.category}</td>
              <td>{data.criticality}</td>
              <td>
                <div className="scenario-status-cell">
                  <select
                    className={`scenario-status-select scenario-status-select--${data.status}`}
                    value={data.status}
                    disabled={isReadOnly}
                    aria-label={`Scenario ${data.title} status`}
                    onChange={(event) =>
                      handleStatusChange(
                        scenarioId,
                        event.target.value as EnvironmentScenarioStatus,
                      )
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td>
                <div className="scenario-evidence-cell">
                  {data.evidenceFileUrl ? (
                    <a href={data.evidenceFileUrl} target="_blank" rel="noreferrer">
                      Open evidence
                    </a>
                  ) : (
                    <span className="section-subtitle">No file</span>
                  )}
                  {!isReadOnly && (
                    <label className="environment-upload">
                      <input
                        type="file"
                        accept="image/*,application/pdf,video/mp4,video/quicktime,application/zip,application/x-zip-compressed"
                        onChange={(event) => handleFileChange(scenarioId, event)}
                      />
                      <span>Upload file</span>
                    </label>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isUpdating && <p className="section-subtitle">Syncing evidence...</p>}
    </div>
  );
};
