Feature: Ambientes
  Background:
    Given estou autenticado como administrador
    And abro a página de ambientes "demo-environment"

  Scenario: Exibir modal de criação de ambiente
    Then devo ver o modal de criação de ambiente

  Scenario: Exibir modal de edição de ambiente
    Then devo ver o modal de edição de ambiente

  Scenario: Exibir modal de exclusão de ambiente
    Then devo ver o modal de exclusão de ambiente
