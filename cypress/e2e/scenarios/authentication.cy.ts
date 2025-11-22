import { AuthPage } from '../../pageObjects/AuthPage';

describe('Cenários de autenticação com page objects', () => {
  const authPage = new AuthPage();

  it('valida a estrutura do formulário de login', () => {
    authPage.visitLogin();
    authPage.assertLoginForm();
  });

  it('valida a estrutura do formulário de cadastro', () => {
    authPage.visitRegister();
    authPage.assertRegisterForm();
  });
});
