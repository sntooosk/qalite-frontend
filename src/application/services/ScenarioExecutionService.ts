import type {
  CreateScenarioExecutionInput,
  ScenarioExecution,
} from '../../domain/entities/ScenarioExecution';
import type { IScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';

export interface QaRankingEntry {
  qaId: string | null;
  qaName: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export interface ScenarioRankingEntry {
  scenarioId: string;
  scenarioTitle: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export interface ScenarioExecutionMetrics {
  totalExecutions: number;
  qaRanking: QaRankingEntry[];
  scenarioRanking: ScenarioRankingEntry[];
  fastestQa: QaRankingEntry | null;
}

export class ScenarioExecutionService {
  constructor(private readonly repository: IScenarioExecutionRepository) {}

  logExecution(payload: CreateScenarioExecutionInput): Promise<void> {
    if (!payload.organizationId) {
      throw new Error('Organização inválida para registrar o tempo do cenário.');
    }

    return this.repository.create(payload);
  }

  async getOrganizationMetrics(organizationId: string): Promise<ScenarioExecutionMetrics> {
    if (!organizationId) {
      throw new Error('Organização inválida para consultar métricas.');
    }

    const executions = await this.repository.listByOrganization(organizationId);
    const qaRanking = this.buildQaRanking(executions);
    const scenarioRanking = this.buildScenarioRanking(executions);

    return {
      totalExecutions: executions.length,
      qaRanking,
      scenarioRanking,
      fastestQa: qaRanking[0] ?? null,
    };
  }

  private buildQaRanking(executions: ScenarioExecution[]): QaRankingEntry[] {
    const map = new Map<string, { entry: QaRankingEntry; totalMs: number }>();

    executions.forEach((execution) => {
      const key = execution.qaId ?? execution.qaName ?? 'unknown';
      const name = execution.qaName?.trim() || 'QA não identificado';
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          entry: {
            qaId: execution.qaId ?? null,
            qaName: name,
            executions: 1,
            averageMs: execution.totalMs,
            bestMs: execution.totalMs,
          },
          totalMs: execution.totalMs,
        });
        return;
      }

      existing.entry.executions += 1;
      existing.totalMs += execution.totalMs;
      existing.entry.bestMs = Math.min(existing.entry.bestMs, execution.totalMs);
      existing.entry.averageMs = existing.totalMs / existing.entry.executions;
    });

    return Array.from(map.values())
      .map(({ entry }) => entry)
      .sort((a, b) => a.averageMs - b.averageMs);
  }

  private buildScenarioRanking(executions: ScenarioExecution[]): ScenarioRankingEntry[] {
    const map = new Map<string, { entry: ScenarioRankingEntry; totalMs: number }>();

    executions.forEach((execution) => {
      const key = execution.scenarioId || `${execution.scenarioTitle}-${execution.environmentId}`;
      const title = execution.scenarioTitle?.trim() || 'Cenário';
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          entry: {
            scenarioId: execution.scenarioId,
            scenarioTitle: title,
            executions: 1,
            averageMs: execution.totalMs,
            bestMs: execution.totalMs,
          },
          totalMs: execution.totalMs,
        });
        return;
      }

      existing.entry.executions += 1;
      existing.totalMs += execution.totalMs;
      existing.entry.bestMs = Math.min(existing.entry.bestMs, execution.totalMs);
      existing.entry.averageMs = existing.totalMs / existing.entry.executions;
    });

    return Array.from(map.values())
      .map(({ entry }) => entry)
      .sort((a, b) => a.averageMs - b.averageMs);
  }
}
