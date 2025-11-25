import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  DataEntry,
  PrivateWorkspace,
  WorkspaceFile,
} from '../../domain/entities/privateWorkspace';

const STORAGE_PREFIX = 'qalite-private-workspace';

const buildStorageKey = (userId: string) => `${STORAGE_PREFIX}-${userId}`;

const createDefaultWorkspace = (): PrivateWorkspace => ({
  notes: '',
  checklists: [
    {
      id: 'quick-checklist',
      title: 'Checklist rápido',
      items: [],
    },
  ],
  dataEntries: [],
  files: [],
});

const generateId = () => crypto.randomUUID();

export const usePrivateWorkspace = (userId: string | undefined) => {
  const [workspace, setWorkspace] = useState<PrivateWorkspace>(createDefaultWorkspace());

  useEffect(() => {
    if (!userId) {
      return;
    }

    const stored = localStorage.getItem(buildStorageKey(userId));
    if (!stored) {
      setWorkspace(createDefaultWorkspace());
      return;
    }

    try {
      const parsed = JSON.parse(stored) as PrivateWorkspace;
      setWorkspace(parsed);
    } catch (error) {
      console.error('Erro ao carregar workspace privado', error);
      setWorkspace(createDefaultWorkspace());
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    localStorage.setItem(buildStorageKey(userId), JSON.stringify(workspace));
  }, [userId, workspace]);

  const updateNotes = useCallback((notes: string) => {
    setWorkspace((previous) => ({ ...previous, notes }));
  }, []);

  const addChecklist = useCallback((title: string) => {
    setWorkspace((previous) => ({
      ...previous,
      checklists: [...previous.checklists, { id: generateId(), title, items: [] }],
    }));
  }, []);

  const addChecklistItem = useCallback((checklistId: string, text: string) => {
    setWorkspace((previous) => ({
      ...previous,
      checklists: previous.checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: [...checklist.items, { id: generateId(), text, checked: false }],
            }
          : checklist,
      ),
    }));
  }, []);

  const toggleChecklistItem = useCallback((checklistId: string, itemId: string) => {
    setWorkspace((previous) => ({
      ...previous,
      checklists: previous.checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item,
              ),
            }
          : checklist,
      ),
    }));
  }, []);

  const removeChecklistItem = useCallback((checklistId: string, itemId: string) => {
    setWorkspace((previous) => ({
      ...previous,
      checklists: previous.checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.filter((item) => item.id !== itemId),
            }
          : checklist,
      ),
    }));
  }, []);

  const addDataEntry = useCallback((entry: Omit<DataEntry, 'id'>) => {
    setWorkspace((previous) => ({
      ...previous,
      dataEntries: [...previous.dataEntries, { ...entry, id: generateId() }],
    }));
  }, []);

  const removeDataEntry = useCallback((id: string) => {
    setWorkspace((previous) => ({
      ...previous,
      dataEntries: previous.dataEntries.filter((entry) => entry.id !== id),
    }));
  }, []);

  const addFiles = useCallback((files: WorkspaceFile[]) => {
    setWorkspace((previous) => ({
      ...previous,
      files: [...files, ...previous.files],
    }));
  }, []);

  const removeFile = useCallback((id: string) => {
    setWorkspace((previous) => ({
      ...previous,
      files: previous.files.filter((file) => file.id !== id),
    }));
  }, []);

  const search = useCallback(
    (term: string) => {
      const normalized = term.trim().toLowerCase();
      if (!normalized) {
        return [] as Array<{ type: string; label: string; id: string }>;
      }

      const results: Array<{ type: string; label: string; id: string }> = [];

      if (workspace.notes.toLowerCase().includes(normalized)) {
        results.push({ type: 'Nota', label: 'Bloco de notas', id: 'notes' });
      }

      workspace.checklists.forEach((checklist) => {
        const checklistMatch = checklist.title.toLowerCase().includes(normalized);
        const itemMatch = checklist.items.find((item) =>
          item.text.toLowerCase().includes(normalized),
        );

        if (checklistMatch || itemMatch) {
          results.push({ type: 'Checklist', label: checklist.title, id: checklist.id });
        }
      });

      workspace.dataEntries.forEach((entry) => {
        if (
          entry.label.toLowerCase().includes(normalized) ||
          entry.value.toLowerCase().includes(normalized)
        ) {
          results.push({ type: 'Massa de dados', label: entry.label, id: entry.id });
        }
      });

      workspace.files.forEach((file) => {
        if (
          file.name.toLowerCase().includes(normalized) ||
          file.folder.toLowerCase().includes(normalized)
        ) {
          results.push({ type: 'Arquivo', label: `${file.folder} / ${file.name}`, id: file.id });
        }
      });

      return results;
    },
    [workspace],
  );

  const storageInfo = useMemo(
    () => ({
      fileCount: workspace.files.length,
      checklistCount: workspace.checklists.length,
      dataEntriesCount: workspace.dataEntries.length,
    }),
    [workspace.checklists.length, workspace.dataEntries.length, workspace.files.length],
  );

  return {
    workspace,
    search,
    updateNotes,
    addChecklist,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addDataEntry,
    removeDataEntry,
    addFiles,
    removeFile,
    storageInfo,
  };
};
