import { StoreSummaryPage } from '../../pageObjects/StoreSummaryPage';
import { EnvironmentModals } from '../../pageObjects/EnvironmentModals';

describe('CRUD de cenários, suítes e ambientes', () => {
  const storeSummary = new StoreSummaryPage();
  const environmentModals = new EnvironmentModals();

  it('valida identificadores dos formulários de cenários e suítes', () => {
    storeSummary.assertScenarioAndSuiteHooks();
  });

  it('valida identificadores dos modais de ambiente', () => {
    environmentModals.assertModalHooks();
  });
});
