import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CreateSprintPayload,
  Sprint,
  SprintBug,
  SprintTestCase,
  TestCaseStatus,
} from '../../domain/entities/sprint';

const STORAGE_PREFIX = 'qalite-org-sprints';

const buildStorageKey = (organizationId: string) => `${STORAGE_PREFIX}-${organizationId}`;

const generateId = () => crypto.randomUUID();

const createSeedSprint = (organizationId: string): Sprint => ({
  id: generateId(),
  organizationId,
  name: 'Sprint de homologação',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  environment: 'Homolog',
  project: 'Loja virtual',
  store: 'Storefront A',
  status: 'ativo',
  notes: 'Mantenha aqui achados rápidos para compartilhar no daily.',
  testCases: [
    { id: generateId(), title: 'Checkout com frete expresso', status: 'executando' },
    { id: generateId(), title: 'Login com e-mail corporativo', status: 'concluido' },
    { id: generateId(), title: 'Cadastro via landing page', status: 'pendente' },
  ],
  bugs: [
    {
      id: generateId(),
      title: 'Erro 500 ao salvar endereço',
      description: 'O endpoint /address retorna 500 com payload válido em homolog.',
      status: 'aberto',
      createdAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
});

export const useOrganizationSprints = (organizationId: string | undefined) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setSprints([]);
      return;
    }

    setIsLoading(true);
    const stored = localStorage.getItem(buildStorageKey(organizationId));
    if (!stored) {
      const seed = createSeedSprint(organizationId);
      setSprints([seed]);
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Sprint[];
      setSprints(parsed);
    } catch (error) {
      console.error('Erro ao carregar sprints', error);
      setSprints([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    localStorage.setItem(buildStorageKey(organizationId), JSON.stringify(sprints));
  }, [organizationId, sprints]);

  const createSprint = useCallback(
    (payload: CreateSprintPayload): Sprint => ({
      id: generateId(),
      organizationId: organizationId ?? '',
      status: 'ativo',
      notes: '',
      testCases: [],
      bugs: [],
      createdAt: new Date().toISOString(),
      ...payload,
    }),
    [organizationId],
  );

  const addSprint = useCallback(
    (payload: CreateSprintPayload) => {
      const newSprint = createSprint(payload);
      setSprints((previous) => [newSprint, ...previous]);
      return newSprint;
    },
    [createSprint],
  );

  const updateSprint = useCallback((sprintId: string, updater: (sprint: Sprint) => Sprint) => {
    setSprints((previous) =>
      previous.map((sprint) => (sprint.id === sprintId ? updater(sprint) : sprint)),
    );
  }, []);

  const removeSprint = useCallback((sprintId: string) => {
    setSprints((previous) => previous.filter((sprint) => sprint.id !== sprintId));
  }, []);

  const addTestCase = useCallback(
    (sprintId: string, title: string) => {
      const testCase: SprintTestCase = { id: generateId(), title, status: 'pendente' };
      updateSprint(sprintId, (sprint) => ({
        ...sprint,
        testCases: [...sprint.testCases, testCase],
      }));
      return testCase;
    },
    [updateSprint],
  );

  const updateTestCaseStatus = useCallback(
    (sprintId: string, testCaseId: string, status: TestCaseStatus) => {
      updateSprint(sprintId, (sprint) => ({
        ...sprint,
        testCases: sprint.testCases.map((testCase) =>
          testCase.id === testCaseId ? { ...testCase, status } : testCase,
        ),
      }));
    },
    [updateSprint],
  );

  const addBug = useCallback(
    (sprintId: string, title: string, description: string) => {
      const bug: SprintBug = {
        id: generateId(),
        title,
        description,
        status: 'aberto',
        createdAt: new Date().toISOString(),
      };

      updateSprint(sprintId, (sprint) => ({ ...sprint, bugs: [bug, ...sprint.bugs] }));
      return bug;
    },
    [updateSprint],
  );

  const updateBugStatus = useCallback(
    (sprintId: string, bugId: string, status: SprintBug['status']) => {
      updateSprint(sprintId, (sprint) => ({
        ...sprint,
        bugs: sprint.bugs.map((bug) => (bug.id === bugId ? { ...bug, status } : bug)),
      }));
    },
    [updateSprint],
  );

  const updateNotes = useCallback(
    (sprintId: string, notes: string) => {
      updateSprint(sprintId, (sprint) => ({ ...sprint, notes }));
    },
    [updateSprint],
  );

  const history = useMemo(
    () =>
      [...sprints].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [sprints],
  );

  return {
    sprints,
    isLoading,
    history,
    addSprint,
    removeSprint,
    addTestCase,
    updateTestCaseStatus,
    addBug,
    updateBugStatus,
    updateNotes,
  };
};
