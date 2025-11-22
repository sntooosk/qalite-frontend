export class StoreSummaryPage {
  visitStore(storeId: string) {
    cy.visit(`/stores/${storeId}`);
  }

  assertScenarioFormElements() {
    cy.get('[data-testid="scenario-form"]').should('exist');
    cy.get('[data-testid="scenario-error"]').should('exist');
    cy.get('[data-testid="category-name"]').should('exist');
    cy.get('[data-testid="category-submit"]').should('exist');
    cy.get('[data-testid="scenario-submit"]').should('exist');
  }

  assertSuiteFormElements() {
    cy.get('[data-testid="suite-form"]').should('exist');
    cy.get('[data-testid="suite-error"]').should('exist');
    cy.get('[data-testid="suite-filter-search"]').should('exist');
    cy.get('[data-testid="suite-filter-category"]').should('exist');
    cy.get('[data-testid="suite-filter-criticality"]').should('exist');
    cy.get('[data-testid="suite-submit"]').should('exist');
  }

  assertStoreSettingsModal() {
    cy.get('[data-testid="store-settings-modal"]').within(() => {
      cy.get('[data-testid="store-settings-error"]').should('exist');
      cy.get('[data-testid="store-settings-form"]').should('exist');
    });
  }
}
