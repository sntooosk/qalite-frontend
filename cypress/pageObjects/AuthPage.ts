export class AuthPage {
  visitLogin() {
    cy.visit('/login');
  }

  visitRegister() {
    cy.visit('/register');
  }

  get loginForm() {
    return cy.get('[data-testid="login-form"]');
  }

  get registerForm() {
    return cy.get('[data-testid="register-form"]');
  }

  assertLoginForm() {
    this.loginForm.should('exist');
    cy.get('[data-testid="login-email"]').should('have.attr', 'type', 'email');
    cy.get('[data-testid="login-password"]').should('have.attr', 'type', 'password');
    cy.get('[data-testid="login-submit"]').contains('Entrar');
  }

  assertRegisterForm() {
    this.registerForm.within(() => {
      cy.get('[data-testid="register-name"]').should('exist');
      cy.get('[data-testid="register-email"]').should('exist');
      cy.get('[data-testid="register-password"]').should('exist');
      cy.get('[data-testid="register-password-confirm"]').should('exist');
      cy.get('[data-testid="register-submit"]').should('contain.text', 'Cadastrar');
    });
  }
}
