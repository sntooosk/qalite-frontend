import { FormEvent, useMemo, useState } from 'react';

import type { EnvironmentScenario, EnvironmentStatus } from '../../../domain/entities/Environment';
import type { StoreScenario, StoreSuite } from '../../../domain/entities/Store';
import { environmentService } from '../../../main/factories/environmentServiceFactory';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { SelectInput } from '../SelectInput';
import { TextArea } from '../TextArea';
import { TextInput } from '../TextInput';

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  suites: StoreSuite[];
  scenarios: StoreScenario[];
  onCreated?: () => void;
}

const STATUS_OPTIONS: { value: EnvironmentStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
];

const TEST_TYPES_BY_ENVIRONMENT: Record<string, string[]> = {
  WS: ['Funcional', 'Regressão', 'Smoke'],
  TM: ['Funcional', 'Homologação'],
  PROD: ['Smoke', 'Regressão completa'],
};

const buildScenarioMap = (
  suite: StoreSuite | undefined,
  scenarioList: StoreScenario[],
): Record<string, EnvironmentScenario> => {
  if (!suite) {
    return {};
  }

  const scenarioMap: Record<string, EnvironmentScenario> = {};
  suite.scenarioIds.forEach((scenarioId) => {
    const match = scenarioList.find((scenario) => scenario.id === scenarioId);
    if (!match) {
      return;
    }

    scenarioMap[scenarioId] = {
      title: match.title,
      category: match.category,
      criticality: match.criticality,
      status: 'pending',
      evidenceFileUrl: null,
    };
  });

  return scenarioMap;
};

export const CreateEnvironmentModal = ({
  isOpen,
  onClose,
  storeId,
  suites,
  scenarios,
  onCreated,
}: CreateEnvironmentModalProps) => {
  const [identifier, setIdentifier] = useState('');
  const [urls, setUrls] = useState('');
  const [jiraTask, setJiraTask] = useState('');
  const [environmentType, setEnvironmentType] = useState('WS');
  const [testType, setTestType] = useState('Funcional');
  const [suiteId, setSuiteId] = useState('');
  const [status, setStatus] = useState<EnvironmentStatus>('backlog');
  const [bugs, setBugs] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.id === suiteId),
    [suiteId, suites],
  );
  const scenarioMap = useMemo(
    () => buildScenarioMap(selectedSuite, scenarios),
    [selectedSuite, scenarios],
  );
  const totalScenarios = Object.keys(scenarioMap).length;

  const testTypeOptions = useMemo(() => {
    const options = TEST_TYPES_BY_ENVIRONMENT[environmentType] ?? ['Funcional'];
    if (!options.includes(testType)) {
      setTestType(options[0]);
    }
    return options;
  }, [environmentType, testType]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim()) {
      setFormError('Provide an identifier for the environment.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const urlsList = urls
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      const timeTracking =
        status === 'in_progress'
          ? { start: new Date().toISOString(), end: null, totalMs: 0 }
          : { start: null, end: null, totalMs: 0 };

      await environmentService.create({
        identifier: identifier.trim(),
        storeId,
        suiteId: selectedSuite?.id ?? null,
        suiteName: selectedSuite?.name ?? null,
        urls: urlsList,
        jiraTask: jiraTask.trim(),
        environmentType,
        testType,
        status,
        timeTracking,
        presentUsersIds: [],
        concludedBy: null,
        scenarios: scenarioMap,
        bugs,
        totalScenarios,
        participants: [],
      });

      onCreated?.();
      onClose();
    } catch (error) {
      console.error(error);
      setFormError('Unable to create the environment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create environment"
      description="Fill in the details to start a new test environment."
    >
      <form className="environment-form" onSubmit={handleSubmit}>
        {formError && <p className="form-message form-message--error">{formError}</p>}
        <TextInput
          id="identifier"
          label="Identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <TextArea
          id="urls"
          label="URLs (one per line)"
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          placeholder="https://example.com"
        />
        <TextInput
          id="jiraTask"
          label="Jira Task"
          value={jiraTask}
          onChange={(event) => setJiraTask(event.target.value)}
        />
        <SelectInput
          id="environmentType"
          label="Environment type"
          value={environmentType}
          onChange={(event) => setEnvironmentType(event.target.value)}
          options={[
            { value: 'WS', label: 'WS' },
            { value: 'TM', label: 'TM' },
            { value: 'PROD', label: 'PROD' },
          ]}
        />
        <SelectInput
          id="testType"
          label="Test type"
          value={testType}
          onChange={(event) => setTestType(event.target.value)}
          options={testTypeOptions.map((option) => ({ value: option, label: option }))}
        />
        <SelectInput
          id="suiteId"
          label="Suite existente"
          value={suiteId}
          onChange={(event) => setSuiteId(event.target.value)}
          options={[
            { value: '', label: 'None' },
            ...suites.map((suite) => ({ value: suite.id, label: suite.name })),
          ]}
        />
        <SelectInput
          id="status"
          label="Initial status"
          value={status}
          onChange={(event) => setStatus(event.target.value as EnvironmentStatus)}
          options={STATUS_OPTIONS}
        />
        <TextInput
          id="bugs"
          label="Known bugs"
          type="number"
          min={0}
          value={String(bugs)}
          onChange={(event) => setBugs(Number(event.target.value))}
        />

        {selectedSuite && (
          <div className="environment-suite-preview">
            <p>
              Loaded scenarios from <strong>{selectedSuite.name}</strong>: {totalScenarios}
            </p>
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} loadingText="Saving...">
          Create environment
        </Button>
      </form>
    </Modal>
  );
};
