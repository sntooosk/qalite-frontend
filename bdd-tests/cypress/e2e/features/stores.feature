Feature: Administração de lojas
  Background:
    Given estou autenticado como administrador
    And abro a página de lojas

  Scenario: Exibir shell de lojas
    Then devo ver a página de lojas com a lista ou estado vazio

  Scenario: Exibir modal de criação de loja
    When eu abro o modal de criação de loja
    Then devo ver os campos obrigatórios de loja

  Scenario: Exibir modal de gerenciamento de organização
    Then devo ver os campos obrigatórios de gerenciamento de organização
