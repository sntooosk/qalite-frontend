export class StoresPage {
  visitAdminStores() {
    cy.visit('/admin/organizations');
  }

  openStoreModal() {
    cy.get('[data-testid="open-store-modal"]').click({ force: true });
  }

  assertStoresShell() {
    cy.get('[data-testid="stores-page"]').should('exist');
    cy.get('[data-testid="open-store-modal"]').should('exist');
    cy.get('[data-testid="store-grid"], [data-testid="stores-empty-state"]').should('exist');
  }

  assertStoreModalFields() {
    cy.get('[data-testid="store-modal"]').within(() => {
      cy.get('[data-testid="store-form"]').should('exist');
      cy.get('[data-testid="store-name"]').should('exist');
      cy.get('[data-testid="store-site"]').should('exist');
      cy.get('[data-testid="store-submit"]').should('exist');
    });
  }

  assertOrganizationManagementFields() {
    cy.get('[data-testid="manage-organization-modal"]').within(() => {
      cy.get('[data-testid="manage-organization-form"]').should('exist');
      cy.get('[data-testid="manage-organization-name"]').should('exist');
      cy.get('[data-testid="manage-organization-slack"]').should('exist');
      cy.get('[data-testid="manage-organization-logo"]').should('exist');
      cy.get('[data-testid="manage-organization-submit"]').should('exist');
    });
  }
}
