# Auditoria de proteção de dados — Fluxo do Casal

Data da revisão: 2026-10-13
Repositório: falcaoguitarcrt-blip/FluxoSaraeFelipe
Branch: audit/protecao-dados-2026-10
Commit-base: 7318e2497fc51f7b9bdfe97d3c3e8645791d8ddb

## Fontes analisadas

- Código ativo: src/main.jsx importa src/App.jsx.
- Conteúdo textual fornecido pelo usuário para shared_state e shared_state_backup_weekly.
- Os dois arquivos textuais mostram os mesmos 29 registros de transação listados, as mesmas 3 compras de cartão e os mesmos 2 investimentos visíveis. Isso não comprova igualdade integral: os arquivos são dumps textuais extraídos, e não uma comparação de objetos JSON originais completos. Não foi possível confirmar hashes, data de leitura nem se refletem o estado atual do Firestore.
- Nenhum documento ou regra Firebase foi alterado.

## Correções na branch de auditoria

- Ampliada a detecção de dados relevantes para considerar contas, contas a pagar, catálogos de categorias, instituições, limites, status de faturas e campos desconhecidos preenchidos.
- Reestruturada a hidratação para impedir criação automática de DEFAULT_STATE quando o documento principal não existe.
- Se forem encontrados dados de recuperação em backup/local/identificador legado, o candidato pode ser apresentado para revisão, mas gravações automáticas ficam bloqueadas e a nuvem não é sobrescrita.
- Em falhas de leitura, o estado de hidratação confiável é retirado e o salvamento fica bloqueado.
- O fluxo de salvamento na branch inclui releitura do documento principal e bloqueio quando o documento está ausente ou diverge do último estado conhecido. Esse controle é best-effort, não uma transação atômica; ainda há risco de corrida entre a leitura e a gravação. Uma solução robusta para concorrência exige controle de versão/transação no Firestore.
- O documento shared_state_backup_weekly permanece um único documento substituível, não um histórico independente.

## Testes

- Criado teste unitário com dados fictícios para detecção de dados significativos, configurações personalizadas, limites, campos desconhecidos e estados vazios.
- O conector GitHub não executa npm localmente. Portanto, não declarar teste/build aprovado até rodá-los em CI ou ambiente local com dependências instaladas.
- Não houve teste de persistência multi-dispositivo ou de conectividade com Firebase.

## Pendências

- Exportação administrativa independente do Firestore não realizada.
- Regras de segurança do Firestore não encontradas no repositório consultado e não verificadas.
- O login permanece anônimo; o PIN local não é autenticação de banco.
- O backup semanal requer estratégia separada de histórico/retention.
- Para concorrência com garantia forte, mover gravação para transação/versionamento no Firestore e testar com dois clientes.
- Não publicar nem mesclar até executar build/testes e revisar diff completo.

## Integridade e publicação

- Dados reais do Firestore modificados: não.
- Publicação: não realizada.
- Branch main: não alterada por esta fase.
- Status: proteção preliminar implementada na branch isolada; ainda não está aprovada para produção.
