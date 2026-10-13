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

- Criado tests/data-protection.test.mjs para testar a função de detecção e cópia usada pela própria aplicação.
- Adicionado script npm test:data-protection.
- Adicionado workflow GitHub Actions .github/workflows/data-protection.yml para executar os testes e o build em Node 20 na branch de auditoria.
- O workflow do commit 7880c55 terminou com sucesso: testes unitários e build aprovados em https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407121083. O workflow do commit 1d08dc9 também terminou com sucesso: testes unitários e build aprovados em https://github.com/falcaoguitarcrt-blip/FluxoSaraeFelipe/actions/runs/38407112635. O workflow do commit 4bfa2fb ainda estava em execução quando esta nota foi atualizada; esse commit contém mudança documental, e seu resultado final deve ser conferido no GitHub. Os testes de integração com Emulator e concorrência continuam inexistentes.

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
