export const AUTOMATION_OPTIONS = [
  { value: 'Automatizado', label: 'Automatizado' },
  { value: 'Não automatizado', label: 'Não automatizado' },
];

export const CRITICALITY_OPTIONS = [
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Média', label: 'Média' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Crítica', label: 'Crítica' },
];

const CRITICALITY_CLASS_MAP: Record<string, string> = {
  baixa: 'criticality-badge--low',
  media: 'criticality-badge--medium',
  média: 'criticality-badge--medium',
  alta: 'criticality-badge--high',
  critica: 'criticality-badge--critical',
  crítica: 'criticality-badge--critical',
};

const normalizeValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLowerCase();

export const getCriticalityClassName = (value: string) => {
  const normalized = normalizeValue(value);
  return CRITICALITY_CLASS_MAP[normalized] ?? 'criticality-badge--low';
};
