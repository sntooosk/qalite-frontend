export class EnvironmentModals {
  assertModalHooks() {
    const files = [
      'src/presentation/components/environments/CreateEnvironmentModal.tsx',
      'src/presentation/components/environments/EditEnvironmentModal.tsx',
      'src/presentation/components/environments/DeleteEnvironmentModal.tsx',
    ];

    const expectedSnippets = [
      'data-testid="environment-modal"',
      'data-testid="environment-form"',
      'data-testid="environment-name"',
      'data-testid="environment-cluster"',
      'data-testid="environment-status"',
      'data-testid="environment-submit"',
      'data-testid="edit-environment-modal"',
      'data-testid="edit-environment-form"',
      'data-testid="edit-environment-name"',
      'data-testid="edit-environment-status"',
      'data-testid="edit-environment-submit"',
      'data-testid="delete-environment-modal"',
      'data-testid="delete-environment-confirm"',
    ];

    files.forEach((filePath) => {
      cy.readFile(filePath).then((content) => {
        expectedSnippets.forEach((snippet) => {
          if (content.includes(snippet)) {
            expect(content).to.include(snippet);
          }
        });
      });
    });
  }
}
