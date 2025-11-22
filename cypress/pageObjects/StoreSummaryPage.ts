export class StoreSummaryPage {
  assertScenarioAndSuiteHooks() {
    const sourcePath = 'src/presentation/pages/StoreSummaryPage.tsx';

    cy.readFile(sourcePath).then((content) => {
      const snippets = [
        'data-testid="scenario-form"',
        'data-testid="scenario-error"',
        'data-testid="category-name"',
        'data-testid="category-submit"',
        'data-testid="scenario-submit"',
        'data-testid="suite-form"',
        'data-testid="suite-error"',
        'data-testid="suite-filter-search"',
        'data-testid="suite-filter-category"',
        'data-testid="suite-filter-criticality"',
        'data-testid="suite-submit"',
        'data-testid="store-settings-modal"',
        'data-testid="store-settings-error"',
        'data-testid="store-settings-form"',
      ];

      snippets.forEach((snippet) => {
        expect(content).to.include(snippet);
      });
    });
  }
}
