import { getScenarioPlatformStatuses } from '../../domain/entities/Environment';
import type { Environment } from '../../domain/entities/Environment';
import type { EnvironmentBug } from '../../domain/entities/EnvironmentBug';
import type { EnvironmentExporter } from '../../application/ports/EnvironmentExporter';
import type { UserSummary } from '../../domain/entities/UserSummary';

const BUG_STATUS_LABEL: Record<EnvironmentBug['status'], string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

const getScenarioLabel = (environment: Environment, scenarioId: string | null) => {
  if (!scenarioId) {
    return 'Não vinculado';
  }

  return environment.scenarios?.[scenarioId]?.titulo ?? 'Cenário removido';
};

const normalizeParticipants = (
  environment: Environment,
  participantProfiles: UserSummary[] = [],
) => {
  const uniqueIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));

  return uniqueIds.map((id) => {
    const profile = profileMap.get(id);
    const displayName = profile?.displayName?.trim() || profile?.email || `Participante ${id}`;

    return {
      id,
      name: displayName,
      email: profile?.email ?? 'Não informado',
      photoURL: profile?.photoURL ?? null,
    };
  });
};

const getInitials = (name: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || name.slice(0, 2).toUpperCase();
};

export class BrowserEnvironmentExporter implements EnvironmentExporter {
  exportAsPDF(
    environment: Environment,
    bugs: EnvironmentBug[] = [],
    participantProfiles: UserSummary[] = [],
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedParticipants = normalizeParticipants(environment, participantProfiles);
    const scenarioRows = Object.values(environment.scenarios ?? {})
      .map((scenario) => {
        const statuses = getScenarioPlatformStatuses(scenario);
        return `
        <tr>
          <td>${scenario.titulo}</td>
          <td>${scenario.categoria}</td>
          <td>${scenario.criticidade}</td>
          <td>${statuses.mobile}</td>
          <td>${statuses.desktop}</td>
          <td>${
            scenario.evidenciaArquivoUrl
              ? `<a href="${scenario.evidenciaArquivoUrl}">Arquivo</a>`
              : 'Sem evidência'
          }</td>
        </tr>
      `;
      })
      .join('');

    const participantRows =
      normalizedParticipants.length > 0
        ? normalizedParticipants
            .map(
              (participant) => `
        <tr>
          <td>
            ${
              participant.photoURL
                ? `<img src="${participant.photoURL}" alt="Foto de ${participant.name}" class="participant-avatar" />`
                : `<span class="participant-avatar participant-avatar--fallback">${getInitials(participant.name)}</span>`
            }
          </td>
          <td>${participant.name}</td>
          <td>${participant.email}</td>
        </tr>
      `,
            )
            .join('')
        : `
        <tr>
          <td colspan="3">Nenhum participante registrado.</td>
        </tr>
      `;

    const bugRows =
      bugs.length > 0
        ? bugs
            .map(
              (bug) => `
        <tr>
          <td>${bug.title}</td>
          <td>${BUG_STATUS_LABEL[bug.status]}</td>
          <td>${getScenarioLabel(environment, bug.scenarioId)}</td>
          <td>${bug.description ?? 'Sem descrição'}</td>
        </tr>
      `,
            )
            .join('')
        : `
        <tr>
          <td colspan="4">Nenhum bug registrado.</td>
        </tr>
      `;

    const documentContent = `
    <html>
      <head>
        <title>Ambiente ${environment.identificador}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          .participants-table .participant-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display: inline-flex; align-items: center; justify-content: center; background: #e5e7eb; color: #374151; font-weight: 600; }
          .participants-table .participant-avatar--fallback { font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>Ambiente ${environment.identificador}</h1>
        <p>Status: ${environment.status}</p>
        <p>Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}</p>
        ${environment.momento ? `<p>Momento: ${environment.momento}</p>` : ''}
        ${environment.release ? `<p>Release: ${environment.release}</p>` : ''}
        <p>Jira: ${environment.jiraTask || 'Não informado'}</p>
        <h2>Participantes</h2>
        <table class="participants-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>${participantRows}</tbody>
        </table>
        <h2>Cenários</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Criticidade</th>
              <th>Status Mobile</th>
              <th>Status Desktop</th>
              <th>Evidência</th>
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
        <h2>Bugs registrados</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Cenário</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>${bugRows}</tbody>
        </table>
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Não foi possível abrir a janela para impressão.');
    }

    printWindow.document.write(documentContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async copyAsMarkdown(
    environment: Environment,
    bugs: EnvironmentBug[] = [],
    participantProfiles: UserSummary[] = [],
  ): Promise<void> {
    if (typeof navigator === 'undefined' && typeof document === 'undefined') {
      return;
    }

    const normalizedParticipants = normalizeParticipants(environment, participantProfiles);
    const scenarioLines = Object.entries(environment.scenarios ?? {})
      .map(([id, scenario]) => {
        const statuses = getScenarioPlatformStatuses(scenario);
        return `- **${scenario.titulo}** (${scenario.categoria} | ${scenario.criticidade}) - Mobile: ${
          statuses.mobile
        } · Desktop: ${statuses.desktop}${
          scenario.evidenciaArquivoUrl ? ` [evidência](${scenario.evidenciaArquivoUrl})` : ''
        } (ID: ${id})`;
      })
      .join('\n');

    const bugLines = bugs
      .map((bug) => {
        const scenarioLabel = getScenarioLabel(environment, bug.scenarioId);
        const description = bug.description ? ` — ${bug.description}` : '';
        return `- **${bug.title}** (${BUG_STATUS_LABEL[bug.status]}) · Cenário: ${scenarioLabel}${description}`;
      })
      .join('\n');

    const urls = (environment.urls ?? []).map((url) => `  - ${url}`).join('\n');
    const participants = normalizedParticipants
      .map((participant) => {
        const photo = participant.photoURL
          ? `![Foto de ${participant.name}](${participant.photoURL}) `
          : '';
        const email = participant.email !== 'Não informado' ? ` (${participant.email})` : '';
        return `- ${photo}**${participant.name}**${email} · ID: ${participant.id}`;
      })
      .join('\n');

    const markdown = `# Ambiente ${environment.identificador}

- Status: ${environment.status}
- Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}
${environment.momento ? `- Momento: ${environment.momento}\n` : ''}${
      environment.release ? `- Release: ${environment.release}\n` : ''
    }- Jira: ${environment.jiraTask || 'Não informado'}
- URLs:\n${urls || '  - Nenhuma URL cadastrada'}

## Cenários
${scenarioLines || '- Nenhum cenário cadastrado'}

## Bugs
${bugLines || '- Nenhum bug registrado'}

## Participantes
${participants || '- Nenhum participante registrado'}
`;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
      return;
    }

    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
}
