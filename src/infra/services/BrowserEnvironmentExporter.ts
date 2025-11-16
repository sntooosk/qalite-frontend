import type { Environment } from '../../domain/entities/Environment';
import type { EnvironmentExporter } from '../../application/ports/EnvironmentExporter';

export class BrowserEnvironmentExporter implements EnvironmentExporter {
  exportAsPDF(environment: Environment): void {
    if (typeof window === 'undefined') {
      return;
    }

    const scenarioRows = Object.values(environment.scenarios ?? {})
      .map(
        (scenario) => `
        <tr>
          <td>${scenario.title}</td>
          <td>${scenario.category}</td>
          <td>${scenario.criticality}</td>
          <td>${scenario.status}</td>
          <td>${
            scenario.evidenceFileUrl
              ? `<a href="${scenario.evidenceFileUrl}">File</a>`
              : 'No evidence'
          }</td>
        </tr>
      `,
      )
      .join('');

    const documentContent = `
    <html>
      <head>
        <title>Environment ${environment.identifier}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Environment ${environment.identifier}</h1>
        <p>Status: ${environment.status}</p>
        <p>Type: ${environment.environmentType} · ${environment.testType}</p>
        <p>Jira: ${environment.jiraTask || 'Not provided'}</p>
        <h2>Scenarios</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Criticality</th>
              <th>Status</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open the print window.');
    }

    printWindow.document.write(documentContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  exportAsMarkdown(environment: Environment): void {
    if (typeof document === 'undefined') {
      return;
    }

    const scenarioLines = Object.entries(environment.scenarios ?? {})
      .map(
        ([id, scenario]) =>
          `- **${scenario.title}** (${scenario.category} | ${scenario.criticality}) - ${
            scenario.status
          }${
            scenario.evidenceFileUrl ? ` [evidence](${scenario.evidenceFileUrl})` : ''
          } (ID: ${id})`,
      )
      .join('\n');

    const markdown = `# Environment ${environment.identifier}

- Status: ${environment.status}
- Type: ${environment.environmentType} · ${environment.testType}
- Jira: ${environment.jiraTask || 'Not provided'}
- URLs:\n${environment.urls.map((url) => `  - ${url}`).join('\n') || '  - No URLs'}

## Scenarios
${scenarioLines || '- No scenarios registered'}

## Participants
${environment.participants.map((id) => `- ${id}`).join('\n') || '- No participants registered'}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `environment-${environment.identifier}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
