# Auditoria de proteção de dados — Fluxo do Casal

Data da auditoria: 2026-10-13
Repositório: falcaoguitarcrt-blip/FluxoSaraeFelipe
Branch de auditoria: audit/protecao-dados-2026-10
Commit-base da auditoria: 7318e2497fc51f7b9bdfe97d3c3e8645791d8ddb

## Escopo executado nesta etapa

- Confirmada a entrada ativa: src/main.jsx importa src/App.jsx.
- Inspecionados os fluxos hydrate, hasMeaningfulUserData, salvamento automático, backup local e documentos de nuvem.
- Confirmado que a última gravação do código em main, em 2026-10-10, foi "Fortalece backup apos cada salvamento".
- Criada branch isolada para a auditoria, sem modificar main.
- Não foram alterados documentos nem regras do Firebase.
- Não foi feito backup dos dados reais do Firestore: o conector GitHub não fornece acesso ao conteúdo do banco, exportação administrativa ou regras Firebase. Portanto, não declarar backup de dados reais concluído.

## Riscos encontrados no código

1. hasMeaningfulUserData só considera transactions, cards, cardPurchases, investments, goals, netWorthHistory e saldos iniciais diferentes de zero. Isso pode tratar como vazio um documento com outras informações relevantes, como bills, categorias personalizadas, limites, contas, instituições, configurações e históricos adicionais.
2. Quando o documento principal não existe, hydrate tenta backups locais. Se não houver backup local útil, ele migra DEFAULT_STATE e o grava na nuvem. A ausência do documento não é prova suficiente de que a aplicação deva inicializar um conjunto novo em produção.
3. shared_state_backup_weekly é atualizado durante o fluxo de salvamento e pode ser sobrescrito. Seu nome sugere retenção semanal, mas o comportamento observado não implementa um histórico independente de versões.
4. O salvamento escreve o backup e o documento principal em chamadas separadas, sem versão monotônica / transação de concorrência que proteja contra clientes desatualizados.
5. A autenticação é anônima e o PIN fica no localStorage com valor inicial conhecido. O PIN é bloqueio visual, não autorização robusta. Não foi possível auditar as regras de segurança do Firestore no repositório.
6. Em falha de leitura do snapshot, a aplicação mostra erro mas marca ready=true; é necessário testar se todas as rotas de interface impedem edição/salvamento quando os dados não foram hidratados de forma confiável.
7. Se o backup em nuvem falhar, o salvamento principal ainda pode ser confirmado, então deve existir distinção explícita entre "dados principais salvos" e "backup atualizado".

## Estado da execução

- Branch criada: audit/protecao-dados-2026-10
- Código-fonte modificado nesta etapa: nenhum
- Dados reais do Firestore exportados: não
- Backup do Firestore validado: não
- Regras do Firestore examinadas: não, arquivo de regras não localizado neste repositório e acesso administrativo Firebase indisponível neste conector
- Testes automatizados/build: não executados
- Publicação: não realizada
- main: preservada

## Próxima etapa bloqueada

Antes de alterar o fluxo de persistência de produção, obter uma exportação autorizada dos documentos Firestore existentes e validar os conjuntos:
- artifacts/fluxo-casal-producao/public/data/finances/shared_state
- artifacts/fluxo-casal-producao/public/data/finances/shared_state_backup_weekly
- shared_state e shared_state_backup_weekly sob os IDs legados definidos em src/App.jsx

Usar exportação nativa do Firestore/Google Cloud ou script administrativo com credenciais seguras fora do navegador. Não inserir credenciais administrativas no repositório. Comparar IDs, campos, arrays, registros e valores da origem com a cópia. Armazenar o backup fora do Firestore e fora do navegador.

Após validação do backup, implementar correções em branch isolada, criar testes com dados fictícios e não publicar nem mesclar enquanto os testes críticos e as verificações de integridade não forem aprovados.
