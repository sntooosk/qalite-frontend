import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

import { AuthPage } from '../pageObjects/AuthPage';
import { OrganizationsPage } from '../pageObjects/OrganizationsPage';
import { StoresPage } from '../pageObjects/StoresPage';
import { StoreSummaryPage } from '../pageObjects/StoreSummaryPage';
import { EnvironmentModals } from '../pageObjects/EnvironmentModals';

const authPage = new AuthPage();
const organizationsPage = new OrganizationsPage();
const storesPage = new StoresPage();
const storeSummaryPage = new StoreSummaryPage();
const environmentModals = new EnvironmentModals();

Given('estou autenticado como administrador', () => {
  // Placeholder to stub authentication context for protected routes when needed
  cy.setCookie('cypress-admin', 'true');
});

Given('eu acesso a página de login', () => {
  authPage.visitLogin();
});

Given('eu acesso a página de cadastro', () => {
  authPage.visitRegister();
});

Given('abro a página de organizações', () => {
  organizationsPage.visitAdmin();
});

Given('abro a página de lojas', () => {
  storesPage.visitAdminStores();
});

Given('abro o resumo da loja {string}', (storeId) => {
  storeSummaryPage.visitStore(storeId);
});

Given('abro a página de ambientes {string}', (environmentId) => {
  environmentModals.visitEnvironment(environmentId);
});

When('eu abro o modal de criação de organização', () => {
  organizationsPage.openOrganizationModal();
});

When('eu abro o modal de criação de loja', () => {
  storesPage.openStoreModal();
});

Then('devo ver os campos de login com data-testid', () => {
  authPage.assertLoginForm();
});

Then('devo ver os campos de cadastro com data-testid', () => {
  authPage.assertRegisterForm();
});

Then('devo ver a página de organizações com botões de criação', () => {
  organizationsPage.assertOrganizationsShell();
});

Then('devo ver os campos obrigatórios de organização', () => {
  organizationsPage.assertOrganizationModalFields();
});

Then('devo ver a página de lojas com a lista ou estado vazio', () => {
  storesPage.assertStoresShell();
});

Then('devo ver os campos obrigatórios de loja', () => {
  storesPage.assertStoreModalFields();
});

Then('devo ver os campos obrigatórios de gerenciamento de organização', () => {
  storesPage.assertOrganizationManagementFields();
});

Then('devo ver o formulário de cenário com seus campos', () => {
  storeSummaryPage.assertScenarioFormElements();
});

Then('devo ver o formulário de suíte com seus filtros', () => {
  storeSummaryPage.assertSuiteFormElements();
});

Then('devo ver o modal de configurações da loja', () => {
  storeSummaryPage.assertStoreSettingsModal();
});

Then('devo ver o modal de criação de ambiente', () => {
  environmentModals.assertCreateEnvironmentFields();
});

Then('devo ver o modal de edição de ambiente', () => {
  environmentModals.assertEditEnvironmentFields();
});

Then('devo ver o modal de exclusão de ambiente', () => {
  environmentModals.assertDeleteEnvironmentFields();
});
