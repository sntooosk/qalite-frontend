export class EnvironmentModals {
  visitEnvironment(environmentId: string) {
    cy.visit(`/environments/${environmentId}`);
  }

  assertCreateEnvironmentFields() {
    cy.get('[data-testid="create-environment-modal"]').within(() => {
      cy.get('[data-testid="create-environment-form"]').should('exist');
      cy.get('[data-testid="create-environment-error"]').should('exist');
      cy.get('[data-testid="create-environment-submit"]').should('exist');
    });
  }

  assertEditEnvironmentFields() {
    cy.get('[data-testid="edit-environment-modal"]').within(() => {
      cy.get('[data-testid="edit-environment-form"]').should('exist');
      cy.get('[data-testid="edit-environment-error"]').should('exist');
      cy.get('[data-testid="edit-environment-submit"]').should('exist');
    });
  }

  assertDeleteEnvironmentFields() {
    cy.get('[data-testid="delete-environment-modal"]').within(() => {
      cy.get('[data-testid="delete-environment-error"]').should('exist');
      cy.get('[data-testid="delete-environment-confirm"]').should('exist');
    });
  }
}
