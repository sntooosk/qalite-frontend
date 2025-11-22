Feature: Administração de organizações
  Background:
    Given estou autenticado como administrador
    And abro a página de organizações

  Scenario: Exibir grade e acionadores
    Then devo ver a página de organizações com botões de criação

  Scenario: Exibir modal de criação de organização
    When eu abro o modal de criação de organização
    Then devo ver os campos obrigatórios de organização
