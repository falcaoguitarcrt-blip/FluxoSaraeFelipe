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
- O salvamento relê o documento principal e bloqueia quando ele está ausente ou diverge do último estado conhecido. É uma proteção best-effort, não uma transação atômica; ainda pode existir uma condição de corrida entre a leitura e a gravação.
- shared_state_backup_weekly continua sendo um único documento substituível e não é um histórico independente.

## Testes e CI

- Criado tests/data-protection.test.mjs para testar a função de detecção e cópia usada pela própria aplicação.
- Adicionado script npm test:data-protection.
- Adicionado workflow GitHub Actions .github/workflows/data-protection.yml para executar os testes e o build em Node 20 na branch de auditoria.
- O conector não executa npm localmente. Os testes/build não devem ser declarados aprovados até que o workflow do GitHub seja concluído com sucesso.

## Pendências

- Exportação administrativa independente do Firestore não realizada.
- Regras de segurança do Firestore não encontradas no repositório consultado e não verificadas.
- O login permanece anônimo; o PIN local não é autenticação do banco.
- Backups históricos com retenção separada ainda não implementados.
- Para garantir concorrência robusta, é necessário versionamento transacional no Firestore e teste real com dois clientes em ambiente isolado.
- Não publicar nem mesclar enquanto o workflow e a revisão crítica não forem aprovados.

## Integridade e publicação

- Dados reais do Firestore modificados: não.
- Publicação: não realizada.
- Branch main: não alterada.
- Status: proteção preliminar implementada na branch isolada; pendente de CI, auditoria das regras de segurança e solução histórica de backups antes da produção.
