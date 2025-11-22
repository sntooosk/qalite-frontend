import { StoresPage } from '../../pageObjects/StoresPage';

describe('CRUD de lojas com page objects', () => {
  const storesPage = new StoresPage();

  it('valida a estrutura da página de lojas', () => {
    storesPage.visit();
    storesPage.assertPageShell();
    storesPage.assertEmptyState();
  });

  it('garante que os modais tenham identificadores de teste configurados', () => {
    storesPage.assertModalsInSource();
  });
});
