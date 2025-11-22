export class OrganizationsPage {
  visit() {
    cy.visit('/admin/organizations');
  }

  get pageSection() {
    return cy.get('[data-testid="organizations-page"]');
  }

  openCreateModal() {
    cy.get('[data-testid="open-organization-modal"]').click();
  }

  assertCreateModalElements() {
    cy.get('[data-testid="organization-modal"]').within(() => {
      cy.get('[data-testid="organization-form"]').should('exist');
      cy.get('[data-testid="organization-name"]').should('exist');
      cy.get('[data-testid="organization-slack"]').should('exist');
      cy.get('[data-testid="organization-logo-upload"]').should('exist');
      cy.get('[data-testid="organization-submit"]').should('contain.text', 'Criar organização');
    });
  }
}
