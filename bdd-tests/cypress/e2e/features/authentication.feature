Feature: Autenticação
  Scenario: Visualizar formulário de login
    Given eu acesso a página de login
    Then devo ver os campos de login com data-testid

  Scenario: Visualizar formulário de cadastro
    Given eu acesso a página de cadastro
    Then devo ver os campos de cadastro com data-testid
