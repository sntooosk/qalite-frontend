Feature: Cenários e suítes por loja
  Background:
    Given estou autenticado como administrador
    And abro o resumo da loja "demo-store"

  Scenario: Exibir formulários de cenário
    Then devo ver o formulário de cenário com seus campos

  Scenario: Exibir formulários de suíte
    Then devo ver o formulário de suíte com seus filtros

  Scenario: Exibir configurações da loja
    Then devo ver o modal de configurações da loja
