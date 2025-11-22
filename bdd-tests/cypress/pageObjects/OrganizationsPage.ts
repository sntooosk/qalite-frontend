export class OrganizationsPage {
  visitAdmin() {
    cy.visit('/admin');
  }

  openOrganizationModal() {
    cy.get('[data-testid="open-organization-modal"]').click({ force: true });
  }

  assertOrganizationsShell() {
    cy.get('[data-testid="organizations-page"]').should('exist');
    cy.get('[data-testid="organization-grid"], [data-testid="stores-empty-state"]').should('exist');
  }

  assertOrganizationModalFields() {
    cy.get('[data-testid="organization-modal"]').within(() => {
      cy.get('[data-testid="organization-form"]').should('exist');
      cy.get('[data-testid="organization-name"]').should('exist');
      cy.get('[data-testid="organization-slack"]').should('exist');
      cy.get('[data-testid="organization-logo-upload"]').should('exist');
      cy.get('[data-testid="organization-submit"]').should('exist');
    });
  }
}
