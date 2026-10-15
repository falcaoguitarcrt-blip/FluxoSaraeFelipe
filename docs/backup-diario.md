# Backup diário

A rotina `daily-backup.yml` executa diariamente às 06:00 UTC e também pode ser acionada manualmente.

## Segurança

- O processo não roda no navegador e não depende do site estar aberto.
- O projeto Firebase é validado antes da leitura.
- A ausência de credenciais interrompe o processo.
- O documento principal nunca é alterado pela rotina.
- Cada execução cria um documento novo em `daily_backups`.
- O histórico não é sobrescrito pela execução seguinte.

## Configuração obrigatória

No repositório GitHub, configure os Secrets:

- `FIREBASE_PROJECT_ID` = `fluxo-de-caixa-59dd1`
- `FIREBASE_SERVICE_ACCOUNT_JSON` = JSON de uma conta de serviço com permissão mínima necessária para leitura de `shared_state` e criação de documentos em `daily_backups`.

O JSON da conta de serviço nunca deve ser colocado no código, em arquivos públicos ou em variáveis versionadas.

## Importante

A rotina só deve ser considerada ativa depois que os dois Secrets forem configurados e uma execução manual for concluída com sucesso. Até essa validação, a existência do workflow não constitui prova de backup realizado.
