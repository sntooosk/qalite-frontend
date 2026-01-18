import { normalizeAutomationEnum } from './scenarioEnums';

export const normalizeAutomationValue = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase();

export const isAutomatedScenario = (value: string | null | undefined) =>
  normalizeAutomationEnum(value) === 'AUTOMATED';
