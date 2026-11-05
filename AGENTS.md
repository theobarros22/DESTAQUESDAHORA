# Instruções para Agentes

Este é o framework de um site de destaques por setor: coleta fontes, filtra e escreve com modelos, agrupa eventos, gera resumos diários, semanais e mensais, e publica tudo por site, RSS, API pública, Markdown para Agentes e MCP. A configuração padrão é um site de exemplo do setor de IA. Leia primeiro o README e depois, conforme a tarefa, o documento correspondente em `docs/`.

## A tarefa mais comum: adaptar para outro setor

Siga a ordem de `docs/customize.md`. O que é próprio do site fica em `site/`: textos e nome do site (`site.ts`), modelo de cada etapa (`models.ts`), marca e logo (`brand/`), páginas de termos (`pages/`), arquivos fixos publicados na raiz do site (`public/`, publicados depois de trocar os marcadores), histórico de atualizações (`changelog.json`). O conhecimento do setor fica em `industry/`: categorias e tags (`taxonomy.ts`), tópicos (`topics.json`), fontes de exemplo (`sources.json`), prompts (`prompts/`), limiares (`selection.ts`). Em geral não é preciso mexer em `apps/` e `packages/`; um recurso que o framework não tem e só este site precisa vira módulo em `modules/` (veja “Módulos” em `docs/architecture.md`).

Estas decisões são da pessoa responsável pelo site; não decida por ela: o nome do site; quais fontes acompanhar; o que é importante e o que é ruído; como dividir as categorias; o conteúdo dos termos e do aviso de privacidade (`site/pages/` é um modelo e precisa da confirmação dela antes de ir ao ar).

Ao mudar os critérios de pontuação, preserve a estrutura original (tipo de conteúdo, cinco dimensões ponderadas, supressão de ruído, limites de segurança) e troque apenas os exemplos de “o que é importante” e “o que é ruído”. Os limiares devem ser recalibrados com amostras rotuladas pela própria pessoa (`docs/selection.md`); não ajuste números por intuição.

## Execução e verificações

- O Node.js 24 executa TypeScript diretamente; o back-end não tem etapa de build. Workspaces npm: `apps/*`, `packages/*`, `industry`, `site`, `modules/*`.
- Execução local e Docker: veja `docs/deploy.md`.
- Depois de alterar, rode pelo menos:
  ```bash
  npm run typecheck
  DATABASE_URL=postgres://127.0.0.1:5432/<nome>_test npm test   # o nome precisa terminar em _test ou _ci; se não existir, é criado e migrado automaticamente, e a conta precisa poder criar bancos
  npm run build -w @aihot/web && npm run test:web
  node scripts/smoke.ts --base http://localhost:3000             # depois que o site estiver no ar
  ```
- Parte dos testes em `tests/` usa categorias, tags e empresas do setor de exemplo; depois de alterar `industry/taxonomy.ts`, troque esses exemplos pelos equivalentes do novo setor.

## Regras que devem ser mantidas

- O front-end (`apps/web`) lê `apps/api` somente por HTTP; banco de dados, chamadas a modelos e chaves ficam só no back-end.
- Todas as saídas públicas leem de uma única camada de leitura, `packages/backend/src/publication/`; qualquer nova saída pública também.
- Abrir uma página não dispara chamada a modelo; modelos só são chamados em tarefas do worker.
- Toda requisição paga passa pelo recibo (`providers/receipts.ts`) e pelo disjuntor de orçamento; não contorne.
- As válvulas de segurança só abrem com o valor `true`. Em desenvolvimento, mantenha fechadas: `COLLECT_ENABLED`, `MODEL_CALLS_ENABLED`, `FEISHU_*_ENABLED`, `INDEXNOW_SUBMIT_ENABLED`. Nos testes o envio fica sempre desligado, e coleta e chamadas a modelos só falam com serviços falsos locais, sem acessar nenhum serviço externo.
- Por padrão as fontes mostram apenas resumo e link do original (`site_fulltext` desligado); o texto completo só é aberto quando a fonte permite expressamente.
- O conteúdo público é anônimo: administradores e visitantes veem o mesmo; a área administrativa é só para administradores.
- Ao desativar ou substituir um recurso ou mecanismo, a mesma mudança remove o código, os testes, a documentação e o estado guardado (tabelas e colunas, tarefas agendadas, settings, variáveis de ambiente e itens do `.env.example`); se isso apagar dados existentes de quem já usa, registre na seção de atualização de `docs/deploy.md`. Travas, novas tentativas, compatibilidade com formato antigo, chaves de liga/desliga e planos de contingência exigem evidência antes: aconteceu em implantação real ou a semântica da plataforma determina que vai acontecer.
- As migrações do banco ficam em `database/migrations/` (tabelas que pertencem a um módulo ficam no `migrations/` dele) e são executadas e registradas pela ordem do nome completo do arquivo; arquivos com o mesmo número mas nomes diferentes são executados separadamente; migrações novas usam novos nomes de arquivo e as já publicadas não são alteradas. A partir de `0055`, cada arquivo contém uma única instrução que pode rodar online, e o PR verifica isso; índices usam `CONCURRENTLY IF NOT EXISTS`, e grandes cargas de dados não entram em migrações publicadas. Validação de restrições e mudanças destrutivas devem ser desenhadas antes conforme a [convenção de migrações](docs/architecture.md#migrações-do-banco-de-dados), sem alterar arquivos históricos nem desativar a verificação.
- Não envie `.env`, chaves nem `.data/` ao repositório.
- Não use o nome nem o logo do AIHOT.

## Escrevendo código

Siga o estilo, os nomes e a densidade de comentários do código ao redor. Escolha a solução simples que resolve com clareza e defina apenas abstrações em uso. Verifique os comportamentos importantes que a mudança toca; não escreva testes para ajustes simples de estilo.

## Enviando PRs para o repositório de origem

Para devolver mudanças ao `KKKKhazix/AIHOT`, leia antes o `CONTRIBUTING.md`. Estes são os casos que mais voltam ou dão retrabalho na revisão:

- **Só aceitamos melhorias válidas para todos os sites.** Uma nova chave de liga/desliga, nova porta de configuração ou novo recurso, por menor que seja, é comportamento de produto; abra antes uma Issue explicando o cenário: cada chave precisa ser mantida por todos os sites a longo prazo, e a maioria dos PRs desse tipo enviados sem discussão não foi aceita. Regras, números e exemplos do seu site ficam em `industry/` e `site/`, nunca em modelos de prompt, comentários e testes compartilhados.
- **Procure o que já existe.** Antes de acrescentar uma função, ponto de extensão ou configuração, pesquise: a capacidade comum provavelmente já tem uma versão. Para um módulo servir os próprios arquivos use `sendFile` de `apps/api/src/routes/static.ts`; para conectar um intermediário de modelos preencha `LLM_BASE_URL`. Escrever outra cópia faz as duas divergirem cedo ou tarde.
- **Um teste só prova os casos em que você pensou.** Se mexeu em coleta, datas, limpeza do texto, seleção ou agrupamento, rode antes e depois da mudança um lote de feeds e páginas reais e públicos e escreva no PR quantos resultados mudaram e se todos mudaram para melhor. Datas de páginas em chinês muitas vezes vêm sem fuso e são lidas no fuso da fonte (padrão `+08:00`); o “CST” acima costuma significar o horário de Pequim; o resultado dos testes não pode depender do fuso da máquina.
- **Teste o comportamento, não a forma de escrever.** O teste que reproduz um problema entra no arquivo de testes que o recurso já tem, sem criar arquivo novo para uma correção; não afirme constantes privadas, classes CSS, posições em pixels nem o comportamento do próprio navegador, e não fixe como teste permanente a saída anterior a uma refatoração. Antes de integrar, os testes são podados por esse critério.
- **Estes tipos de arquivo não recebem alterações em PRs externos:** dependências e arquivos de lock (as atualizações de versão vêm do dependabot), `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, as regras em `.agents/` e `.claude/`, e arquivos binários (amostras necessárias aos testes devem ser geradas por código). Se algo precisa mudar, abra antes uma Issue explicando; quem altera são os mantenedores: os arquivos de regras decidem como os próximos Agentes trabalham, e dependências e binários não dá para revisar linha a linha.
- **Mude tudo o que for preciso.** Novas variáveis de ambiente entram no `.env.example`, nova configuração do site entra em `site/`; se o significado de um campo de configuração mudou, a configuração de exemplo acompanha, para que os sites já implantados mantenham o comportamento após atualizar (por exemplo, ao passar a anexar imagens só a modelos que declaram `vision`, as predefinições que já enxergavam imagens precisam ganhar a declaração); ao mudar um nome ou entrada que o leitor vê, mude em todos os lugares em que ele aparece. Ao criar ou alterar a configuração de navegação, confira separadamente, na configuração padrão e em uma não padrão, a barra lateral do computador, a barra inferior do celular, o botão de voltar e a entrada “Minha área”, e veja no navegador o layout dos rótulos quando houver menos entradas; manter o valor padrão só prova o comportamento original, não que a configuração funciona.
