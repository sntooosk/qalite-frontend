import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { Environment, EnvironmentStatus } from '../../../domain/entities/Environment';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';

interface EditEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment | null;
}

const STATUS_OPTIONS: { value: EnvironmentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export const EditEnvironmentModal = ({
  isOpen,
  onClose,
  environment,
}: EditEnvironmentModalProps) => {
  const [identifier, setIdentifier] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [environmentType, setEnvironmentType] = useState('WS');
  const [testType, setTestType] = useState('Funcional');
  const [status, setStatus] = useState<EnvironmentStatus>('backlog');
  const [bugs, setBugs] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!environment) {
      return;
    }

    setIdentifier(environment.identifier);
    setUrls(environment.urls.join('\n'));
    setJiraTask(environment.jiraTask);
    setEnvironmentType(environment.environmentType);
    setTestType(environment.testType);
    setStatus(environment.status);
    setBugs(environment.bugs);
  }, [environment]);

  const isLocked = environment?.status === 'done';
  const suiteSummary = useMemo(
    () => Object.keys(environment?.scenarios ?? {}).length,
    [environment?.scenarios],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!environment) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const urlsList = urls
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      await environmentService.update(environment.id, {
        identifier: identifier.trim(),
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        environmentType,
        testType,
        bugs,
      });

      if (environment.status !== status) {
        await environmentService.transitionStatus({
          environment,
          targetStatus: status,
        });
      }

      onClose();
    } catch (error) {
      console.error(error);
      setFormError('Unable to update the environment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit environment"
      description="Update the details as needed."
    >
      <form className="environment-form" onSubmit={handleSubmit}>
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <TextInput
          id="identifierEdit"
          label="Identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
          disabled={isLocked}
        />
        <TextArea
          id="urlsEdit"
          label="URLs"
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          disabled={isLocked}
        />
        <TextInput
          id="jiraEdit"
          label="Jira Task"
          value={jiraTask}
          onChange={(event) => setJiraTask(event.target.value)}
          disabled={isLocked}
        />
        <SelectInput
          id="environmentTypeEdit"
          label="Environment type"
          value={environmentType}
          onChange={(event) => setEnvironmentType(event.target.value)}
          disabled={isLocked}
          options={[
            { value: 'WS', label: 'WS' },
            { value: 'TM', label: 'TM' },
            { value: 'PROD', label: 'PROD' },
          ]}
        />
        <TextInput
          id="testTypeEdit"
          label="Test type"
          value={testType}
          onChange={(event) => setTestType(event.target.value)}
          disabled={isLocked}
        />
        <SelectInput
          id="statusEdit"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as EnvironmentStatus)}
          options={STATUS_OPTIONS}
          disabled={isLocked}
        />
        <TextInput
          id="bugsEdit"
          label="Bugs"
          type="number"
          min={0}
          value={String(bugs)}
          onChange={(event) => setBugs(Number(event.target.value))}
          disabled={isLocked}
        />
        <p className="environment-suite-preview">Linked scenarios: {suiteSummary}</p>
        <Button type="submit" disabled={isLocked} isLoading={isSubmitting} loadingText="Saving...">
          Save changes
        </Button>
      </form>
    </Modal>
  );
};
