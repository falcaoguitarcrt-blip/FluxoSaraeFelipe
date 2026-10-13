# Auditoria de proteção de dados — Fluxo do Casal

Data da revisão: 2026-10-13
Repositório: falcaoguitarcrt-blip/FluxoSaraeFelipe
Branch: audit/protecao-dados-2026-10
Commit-base: 7318e2497fc51f7b9bdfe97d3c3e8645791d8ddb

## Fontes analisadas

- Código ativo: src/main.jsx importa src/App.jsx.
- Conteúdo textual fornecido pelo usuário para shared_state e shared_state_backup_weekly.
- Os dois arquivos textuais mostram os mesmos 29 registros de transação listados, as mesmas 3 compras de cartão e os mesmos 2 investimentos visíveis. Isso não comprova igualdade integral: os arquivos são dumps textuais extraídos, não objetos JSON originais completos. Não foi possível confirmar hashes, data exata de leitura nem se refletem o estado atual do Firestore.
- Nenhum documento ou regra Firebase foi alterado.

## Correções na branch de auditoria

- A detecção de dados relevantes foi separada em src/dataProtection.js e ampliada para considerar registros financeiros, contas personalizadas, categorias e configurações customizadas, limites, estados de faturas e campos desconhecidos preenchidos.
- A hidratação impede criar automaticamente DEFAULT_STATE quando o documento principal não existe. Recuperações a partir de backup/local/IDs legados são tratadas como candidatas de revisão; a nuvem não é sobrescrita automaticamente.
- Erros de leitura limpam o sinal de hidratação confiável e bloqueiam salvamentos.
- O salvamento usa uma transação do Firestore: lê o documento principal, compara o estado com a última versão observada e, na mesma transação, grava uma versão histórica independente em `artifacts/{appId}/public/data/finances/shared_state/versions/{versionId}` e atualiza `shared_state`. Uma divergência aborta a transação. A comparação usa `snapshotsEqual`, que ordena chaves de objetos e preserva a ordem de arrays; valores que não sejam JSON simples são rejeitados para comparação. A base remota observada fica separada do clone local JSON para evitar converter tipos Firestore no baseline.
- Cada versão histórica armazena identificador, timestamp do servidor, origem, versão do envelope e uma cópia do documento anterior, incluindo campos desconhecidos.
- O mecanismo depende de as regras efetivas do Firestore permitirem leitura/escrita na subcoleção `shared_state_versions`. Como as regras não foram encontradas nem verificadas, a compatibilidade de permissões permanece pendente; se a gravação histórica for negada, a transação inteira deve falhar sem atualizar o documento principal.
- Ainda não há interface de comparação/restauração nem política de retenção automática. As versões não devem ser apagadas automaticamente até que uma política de retenção e as permissões sejam revisadas.
- A transação não foi executada contra o Firebase real. Os testes atuais validam o envelope e a preservação de campos, mas não substituem testes de integração com Firestore Emulator e duas sessões concorrentes.
- `shared_state_backup_weekly` continua sendo um único documento substituível; a nova coleção de versões é uma estratégia separada implementada no código, pendente de validação de regras e integração.

## Testes e CI

- Criado `tests/data-protection.test.mjs` para testar a detecção de dados, cópia do estado, envelope histórico e comparação estável de snapshots.
- Adicionado script npm `test:data-protection`.
- Adicionado workflow GitHub Actions `.github/workflows/data-protection.yml` para executar testes e build com Node 20.
- Execuções de CI concluídas com sucesso, incluindo testes unitários e build:
  - https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407112635
  - https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407121083
  - https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407157083
  - https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407179601
- O workflow do commit documental final `8da08045ccaeda54e777da964814a7895fbee2ce` estava em andamento no momento da última consulta: https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407273157.
- Os workflows acima não cobrem integração com Firestore Emulator ou concorrência entre sessões; esses testes permanecem pendentes.

## Pendências

- Exportação administrativa independente do Firestore não realizada.
- Regras de segurança do Firestore não encontradas no repositório consultado e não verificadas.
- O login permanece anônimo; o PIN local não é autenticação do banco.
- A gravação de versões históricas foi implementada no código da branch, mas a permissão efetiva, a criação real de versões e o comportamento em Firestore Emulator ainda não foram validados. Interface de comparação/restauração e retenção documentada continuam pendentes.
- O caminho de salvamento foi convertido para transação atômica com verificação da versão-base; ainda é necessário validar com Firestore Emulator e dois clientes isolados, inclusive quando as regras negam a subcoleção histórica.
- Não publicar nem mesclar enquanto o workflow e a revisão crítica não forem aprovados.

## Integridade e publicação

- Dados reais do Firestore modificados: não.
- Publicação: não realizada.
- Branch main: não alterada.
- Status: proteção preliminar implementada na branch isolada; pendente de CI, auditoria das regras de segurança e solução histórica de backups antes da produção.

## Fase 6.1 — isolamento do emulador e integração da persistência

### Alterações feitas na branch de auditoria

- Extraído o salvamento transacional para `src/firestorePersistence.js`, função `persistSnapshotAtomically`, para que o mesmo código usado pelo aplicativo possa ser exercitado em testes de integração.
- `src/App.jsx` agora chama a função compartilhada para verificar a versão-base, registrar o histórico e atualizar o documento principal dentro da mesma transação.
- Adicionado `tests/firebase/firebase.json`, com o Firestore Emulator em `127.0.0.1:8080` e configuração de regras específica de testes.
- Adicionado `tests/firebase/firestore.rules` com negação por padrão. Os testes carregam regras sintéticas explicitamente para cada cenário.
- Adicionado `tests/firestore-persistence.integration.test.mjs` com fixtures sintéticas para salvamento normal, falha ao gravar histórico, documento ausente, escrita negada, dois clientes concorrentes, versão-base obsoleta, repetição com nova versão-base e preservação de campos/valores JSON.
- Adicionadas as dependências de desenvolvimento `firebase-tools` e `@firebase/rules-unit-testing`, além do script `test:integration`.
- Atualizado `.github/workflows/data-protection.yml` para executar os testes unitários, iniciar o Firestore Emulator com o projeto explícito `demo-fluxo-casal-test`, executar os testes de integração e fazer build sem deploy.

### Resultados e limitações

- **Parcialmente validado:** o código de integração e a configuração do emulador foram adicionados à branch, mas não foi possível executar localmente o emulador neste ambiente de edição remota.
- **Pendente de CI:** o workflow atualizado é acionado por push na branch de auditoria. O resultado dessa execução precisa ser consultado no GitHub; a consulta disponível de execuções por commit não retorna execuções disparadas por push, portanto não há evidência suficiente para marcar os testes como aprovados neste relatório.
- **Parcialmente validado:** os testes foram escritos para conferir o documento efetivamente persistido e para que uma transação concorrente obsoleta seja rejeitada. Até a execução do emulador, não há resultado observado desses cenários.
- **Bloqueado:** timeout, perda de conexão e reconexão não foram simulados nesta etapa.
- **Bloqueado:** a preservação de tipos não JSON, como `Timestamp`, `Date` e `DocumentReference`, não foi demonstrada. O esquema atualmente exercitado usa valores JSON compatíveis. `clonePersistedData` continua usando `JSON.stringify/JSON.parse`; não foi feita substituição especulativa sem evidência de quais tipos especiais fazem parte do modelo efetivamente persistido.
- **Bloqueado:** as regras efetivas de produção continuam indisponíveis e não foram verificadas. As regras em `tests/firebase/firestore.rules` são exclusivas da configuração de emulador e não demonstram permissões de produção.
- **Bloqueado:** não foi criada interface de restauração histórica nesta etapa, conforme o escopo.
- Nenhuma escrita, exclusão, migração ou restauração foi executada no Firebase de produção. Nenhum dado financeiro real foi usado nos testes preparados. Não houve deploy, merge ou alteração da `main`.

### Commits da Fase 6.1

- `b0769ee10a653bb12d41e63cb3ff1ea895dc3afc` — extração do salvamento transacional.
- `e7e44e125e047008102905e4436411fb473009f1` — regras do emulador com negação por padrão.
- `0be3a833d6ef096cdf10773d75329527cc2b54c4` — configuração do emulador de teste.
- `f65e2248000761f3d697e122236070f33b49d2e6` — testes de integração e concorrência.
- `97dce6790c9ba9718a00499e0bd3eaaab76b16fa` — integração da função compartilhada em `src/App.jsx`.
- `46588a4ab2501e001fcd4b3a2b86aa2ab145e289` — scripts e dependências de testes.
- `d732ddf5bfa373ff7a0db77ade2670efc18e6c83` — workflow de CI com emulador.

### Situação da Fase 6.1

**Ainda não concluída.** Os arquivos foram adicionados e conectados na branch de auditoria, mas a aprovação depende de executar e inspecionar o CI atualizado, corrigir eventuais falhas e confirmar o HEAD final. Os critérios de tipos especiais, conectividade e regras de produção continuam abertos.
