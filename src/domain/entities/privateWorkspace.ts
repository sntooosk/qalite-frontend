export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface DataEntry {
  id: string;
  label: string;
  value: string;
  type: 'CPF' | 'E-mail' | 'ID' | 'Token' | 'URL' | 'Outro';
}

export interface WorkspaceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  folder: string;
  uploadedAt: string;
  previewUrl?: string;
}

export interface PrivateWorkspace {
  notes: string;
  checklists: Checklist[];
  dataEntries: DataEntry[];
  files: WorkspaceFile[];
}
