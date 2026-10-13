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
- `6f2a8eb618cbd26b5de0ef5f1e767e1e56b3a2dd` — remoção de imports obsoletos após a extração da transação.

### Situação da Fase 6.1

**Ainda não concluída.** Os arquivos foram adicionados e conectados na branch de auditoria, mas a aprovação depende de executar e inspecionar o CI atualizado, corrigir eventuais falhas e confirmar o HEAD final. Os critérios de tipos especiais, conectividade e regras de produção continuam abertos.


## Fase 6.2 — verificação de evidências e endurecimento do isolamento

Data da verificação: 2026-10-13.

### Estado observado

- **APROVADO — comparação de referências:** a comparação de `main` com `audit/protecao-dados-2026-10` retornou 38 commits à frente e 0 atrás. A referência-base/merge-base retornada foi `7318e2497fc51f7b9bdfe97d3c3e8645791d8ddb`.
- **PENDENTE DE EVIDÊNCIA — CI no HEAD:** a consulta ao status combinado do commit conhecido `45f68c082495565bef7b158e0eabc9e99756d738` retornou lista vazia de status; a consulta de execuções por commit também retornou lista vazia. O conector disponível filtra execuções por eventos de pull request, portanto isso não prova que um workflow disparado por push não exista. Não foi possível obter evidência observável de execução do workflow atualizado ou seus códigos de saída nesta verificação.
- **PENDENTE DE EVIDÊNCIA — testes e build:** não foi possível executar os comandos de teste, iniciar o emulador nem executar o build no ambiente de trabalho disponível. Os testes existentes continuam sendo testes escritos, não testes comprovadamente executados nesta fase.
- **PENDENTE DE EVIDÊNCIA — regras de produção:** os arquivos de regras presentes no repositório são configuração de teste; não demonstram as regras efetivas do projeto Firebase de produção. Nenhuma regra de produção foi lida ou alterada.
- **PENDENTE DE EVIDÊNCIA — comportamento offline/reconexão:** não há resultado observado de simulações de desconexão, timeout ou reconexão.
- **PENDENTE DE EVIDÊNCIA — tipos não JSON:** não foi demonstrado que o esquema real contém apenas valores JSON simples. A clonagem por `JSON.stringify/JSON.parse` e o bloqueio de comparação para objetos não simples continuam sendo limitações a verificar contra o modelo efetivamente persistido.

### Correção de isolamento nesta fase

- Commit `fd71bd748fe3bc07c934328667072e63bab45e29` — `test: require explicit Firestore emulator isolation`.
- O setup dos testes de integração agora exige `GCLOUD_PROJECT=demo-fluxo-casal-test` e `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`; se `FIREBASE_CONFIG` estiver presente, exige JSON válido e `projectId` igual ao projeto sintético. O objetivo é falhar fechado se o ambiente de teste não corresponder ao emulador configurado.
- **PENDENTE DE EXECUÇÃO:** esta alteração foi inspecionada no conteúdo do commit, mas não foi executada localmente nem validada por uma execução observada do CI. Portanto, não se declara que a nova barreira já passou por testes.

### Decisão da Fase 6.2

**BLOQUEADA / PENDENTE DE EVIDÊNCIA.** A comparação da branch e a alteração de segurança foram verificadas pelo conteúdo do repositório, mas não há evidência suficiente para aprovar a suíte de integração, o build, o comportamento de falhas nem as regras efetivas de produção.

Para desbloquear: obter uma execução observável do workflow na branch de auditoria com sucesso em instalação, testes unitários, Firestore Emulator, integração e build; corrigir qualquer falha; verificar as regras efetivas de produção por acesso administrativo somente de leitura; e testar os cenários offline/reconexão ou registrar limites específicos.

### Integridade e escopo

- Alterações feitas somente na branch `audit/protecao-dados-2026-10`.
- Nenhuma alteração, merge ou publicação na `main`.
- Nenhum deploy.
- Nenhuma escrita, exclusão, migração ou restauração no Firebase de produção.
- Nenhum dado financeiro real usado nos testes preparados.
- A Fase 6.2 não autoriza iniciar restauração histórica nem qualquer operação de produção.


## Fase 6.3 — execução comprovada e estado observado

Data da verificação: 2026-10-13.

### Estado inicial confirmado

- HEAD inicial: `6cdcffe48ffa4aa774edb0bedf4a900942f78f9a`, commit `docs: record phase 6.2 evidence status and isolation guard`.
- Comparação de `audit/protecao-dados-2026-10` contra a referência-base `7318e2497fc51f7b9bdfe97d3c3e8645791d8ddb`: 40 commits à frente, 0 atrás; merge-base retornado igual à referência-base.
- Workflow configurado para eventos `push` na branch de auditoria e `pull_request` com destino à `main`. Etapas declaradas: instalar dependências, testes unitários, Firestore Emulator + testes de integração, build sem deploy.

### Evidências e limitações reais desta verificação

- **PENDENTE DE EVIDÊNCIA — execução do CI:** a consulta disponível de execuções associadas ao HEAD retornou uma lista vazia, mas o conector documenta que filtra apenas execuções de pull request. O status combinado também retornou uma lista vazia. Esses resultados não permitem concluir se houve execução de push. A página Actions e o endpoint público da API não puderam ser acessados por este ambiente; portanto não foi possível recuperar IDs de execução, jobs, códigos de saída ou logs. Nenhuma conclusão de sucesso ou falha foi inferida.
- **PENDENTE DE EVIDÊNCIA — testes locais:** Node.js `v22.16.0`, npm `10.9.2` e Git `2.47.3` estão disponíveis. O comando `git clone --branch audit/protecao-dados-2026-10 --single-branch https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe.git /tmp/FluxoSaraeFelipe` falhou com código de saída 128: `Could not resolve host: github.com`. Não foi possível instalar dependências, comprovar um emulador ativo, executar os testes unitários/de integração ou realizar o build localmente. Nenhum teste é marcado como aprovado com base apenas na existência dos arquivos.
- **APROVADO — isolamento declarado no código:** a configuração de teste aponta o Firestore Emulator para `127.0.0.1:8080`; o setup de integração exige `GCLOUD_PROJECT=demo-fluxo-casal-test` e `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, e valida `FIREBASE_CONFIG.projectId` quando essa variável existe. Isso comprova as barreiras declaradas no código, não a execução real nem a atividade do emulador.
- **PENDENTE DE EVIDÊNCIA — cobertura de permissões:** há testes sintéticos para negação de escrita histórica e negação de escrita principal. Ainda não há cenário explícito para negar a leitura do documento principal. Os cenários de timeout, desconexão e reconexão não foram reproduzidos.
- **PENDENTE DE EVIDÊNCIA — tipos de dados:** o comparador rejeita objetos não simples e valores não finitos/unsupported; a clonagem usa `JSON.stringify/JSON.parse` e, em caso de exceção, retorna o valor original. Não há evidência suficiente nesta revisão para concluir que todos os tipos reais persistidos são JSON simples ou que os tipos especiais sejam preservados com segurança.
- **PENDENTE DE EVIDÊNCIA — regras de produção:** não foi obtida evidência administrativa somente de leitura das regras efetivas. `tests/firebase/firestore.rules` é exclusivo do ambiente de teste e não prova as permissões de produção.

### Comandos e códigos de saída observados

| Comando/consulta | Resultado |
| --- | --- |
| `node --version` | `v22.16.0`, código 0 |
| `npm --version` | `10.9.2`, código 0 |
| `git --version` | `git version 2.47.3`, código 0 |
| `git clone --branch audit/protecao-dados-2026-10 --single-branch https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe.git /tmp/FluxoSaraeFelipe` | Falhou, código 128: falha de resolução DNS para `github.com` |
| Consulta de workflows associada ao HEAD via conector | Lista vazia; consulta limitada a eventos de pull request, portanto inconclusiva para push |
| Status combinado do HEAD | Lista vazia; não constitui prova de aprovação |

### Decisão da Fase 6.3

**BLOQUEADA / PENDENTE DE EVIDÊNCIA.** A branch e a referência-base foram confirmadas. O ambiente atual não permite obter os logs do workflow de push nem clonar o repositório para executar a suíte local. Testes unitários, integração e build permanecem não executados/sem evidência nesta sessão.

Próximos requisitos para desbloqueio:
1. Consultar o endpoint completo de execuções de GitHub Actions para o repositório, filtrando pela branch `audit/protecao-dados-2026-10` e evento `push`, e inspecionar jobs/logs.
2. Se não houver execução, diagnosticar permissões/configuração do Actions e gerar uma nova execução por um push de auditoria controlado, sem tocar na `main` nem fazer deploy.
3. Obter execução bem-sucedida de instalação, testes unitários, emulator + integração e build; corrigir falhas observadas sem enfraquecer as verificações.
4. Acrescentar/validar o cenário de leitura negada e determinar o comportamento de timeout/reconexão em ambiente sintético.
5. Obter acesso administrativo somente de leitura às regras efetivas de produção, sem modificá-las.

### Integridade e escopo

- Nenhuma alteração, merge ou publicação na `main`.
- Nenhum deploy.
- Nenhuma escrita, exclusão, migração ou restauração no Firebase de produção.
- Nenhum dado financeiro real usado em testes.
- Nenhuma restauração histórica ou funcionalidade nova iniciada.
