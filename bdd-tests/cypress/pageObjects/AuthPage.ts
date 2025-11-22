export class AuthPage {
  visitLogin() {
    cy.visit('/login');
  }

  visitRegister() {
    cy.visit('/register');
  }

  assertLoginForm() {
    cy.get('[data-testid="login-form"]').should('exist');
    cy.get('[data-testid="login-email"]').should('have.attr', 'type', 'email');
    cy.get('[data-testid="login-password"]').should('have.attr', 'type', 'password');
    cy.get('[data-testid="login-submit"]').should('contain.text', 'Entrar');
  }

  assertRegisterForm() {
    cy.get('[data-testid="register-form"]').should('exist');
    cy.get('[data-testid="register-name"]').should('exist');
    cy.get('[data-testid="register-email"]').should('exist');
    cy.get('[data-testid="register-password"]').should('exist');
    cy.get('[data-testid="register-password-confirm"]').should('exist');
    cy.get('[data-testid="register-submit"]').should('contain.text', 'Cadastrar');
  }
}
