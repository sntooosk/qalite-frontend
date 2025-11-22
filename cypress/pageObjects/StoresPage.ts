export class StoresPage {
  visit() {
    cy.visit('/admin/stores');
  }

  assertPageShell() {
    cy.get('[data-testid="stores-page"]').should('exist');
    cy.get('[data-testid="open-store-modal"]').should('exist');
  }

  assertEmptyState() {
    cy.get('[data-testid="stores-empty-state"]').should('exist');
  }

  assertModalsInSource() {
    const storePagePath = 'src/presentation/pages/AdminStoresPage.tsx';

    cy.readFile(storePagePath).then((content) => {
      const expected = [
        'data-testid="store-modal"',
        'data-testid="store-form"',
        'data-testid="store-name"',
        'data-testid="store-site"',
        'data-testid="store-submit"',
        'data-testid="manage-organization-modal"',
        'data-testid="manage-organization-form"',
        'data-testid="manage-organization-name"',
        'data-testid="manage-organization-slack"',
        'data-testid="manage-organization-logo"',
        'data-testid="manage-organization-submit"',
      ];

      expected.forEach((snippet) => {
        expect(content).to.include(snippet);
      });
    });
  }
}
