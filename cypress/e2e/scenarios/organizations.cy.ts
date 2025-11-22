import { OrganizationsPage } from '../../pageObjects/OrganizationsPage';

describe('CRUD de organizações com page objects', () => {
  const organizationsPage = new OrganizationsPage();

  it('abre a página e expõe o modal de criação', () => {
    organizationsPage.visit();
    organizationsPage.pageSection.should('exist');
    organizationsPage.openCreateModal();
    organizationsPage.assertCreateModalElements();
  });
});
