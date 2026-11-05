# Como contribuir

Contribuições são bem-vindas: problemas reproduzíveis, correções de documentação e melhorias que também sirvam a outros setores. Pode escrever em português, inglês ou chinês.

## Onde conversar

- [Issues](https://github.com/theobarros22/DESTAQUESDAHORA/issues/new/choose): bugs reproduzíveis e sugestões de recursos com um cenário claro.
- Dúvidas de instalação, configuração, implantação e uso: abra uma Issue com a descrição do problema.
- Ideias e direção do projeto: comece por uma Issue explicando o cenário de uso.
- Vulnerabilidades de segurança: envie em particular, conforme as [instruções de segurança](SECURITY.md).

## Escopo das contribuições

Damos prioridade a melhorias na experiência de implantação, na capacidade geral de coleta, no fluxo de processamento, nas interfaces públicas, na acessibilidade, na documentação e na correção de falhas reproduzíveis. Antes de mudar bastante a arquitetura ou o comportamento do produto, explique o cenário e a proposta em uma Issue, para não investir esforço e só depois descobrir que a direção não serve.

Fontes e critérios de seleção que só servem ao seu setor ficam em `industry/` no seu próprio repositório; nome do site, marca e páginas ficam em `site/`; um recurso que só o seu site precisa vira módulo em `modules/` (veja [Arquitetura](docs/architecture.md#módulos)). Os passos estão na [documentação de personalização](docs/customize.md). Por razões de conformidade e de risco, a lista completa de fontes de produção não é compartilhada; este repositório também não mantém adaptadores de coleta específicos para plataformas como Weibo e Xiaohongshu, mas você pode integrar resultados de coleta externos mantidos por você, conforme a [documentação de fontes](docs/sources.md).

## Enviando alterações

1. Faça um Fork do repositório e crie sua branch a partir do `main` mais recente. Se você só quer montar um site independente, pode usar o [Use this template](https://github.com/theobarros22/DESTAQUESDAHORA/generate); o projeto gerado por modelo não compartilha o histórico de commits, então, para contribuir com código ou incorporar atualizações da origem, o Fork é mais adequado.
2. Leia o [AGENTS.md](AGENTS.md) e a documentação correspondente à mudança. Mantenha cada PR resolvendo um único problema claro, sem refatorações alheias e sem alterações no `package-lock.json` causadas por reinstalar dependências. Atualizações de dependências, arquivos de regras de Agentes (`AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`) e arquivos binários não aceitam alterações em PRs externos; se for necessário, abra antes uma Issue e os mantenedores fazem a mudança.
3. Configure o ambiente local pela [documentação de implantação](docs/deploy.md). Use um banco de testes separado, deixe desligadas a coleta, as chamadas a modelos e os envios externos durante o desenvolvimento, e não teste com banco de produção nem com serviços pagos reais.
4. Verifique os comportamentos que a mudança toca e registre os resultados no PR; o CI de Forks só roda depois da aprovação de um mantenedor e não substitui as verificações locais. Para mudanças de código, rode `npm run typecheck`, `npm test`, o build do site e os testes do site; o nome do banco de testes do back-end deve terminar em `_test` ou `_ci` (se não existir, é criado e migrado automaticamente), e cada arquivo de teste roda em paralelo em uma cópia dele, por isso a conta do banco de testes precisa da permissão `CREATEDB`. Um site em execução pode ser verificado com `node scripts/smoke.ts --base http://localhost:3000`. Em mudanças só de documentação ou de modelos, basta conferir links, sintaxe e a exibição real; não é preciso criar testes só para aumentar a quantidade.
   Ao mexer no banco de dados, não altere migrações já publicadas: a correção vai em um arquivo novo, que contém uma única instrução que pode rodar online; o PR é verificado automaticamente e, localmente, você pode rodar antes `node scripts/check-migrations.ts --base main`. As regras estão na [convenção de migrações](docs/architecture.md#migrações-do-banco-de-dados).
   O teste de backup e restauração também exige `tar` e um `pg_dump`/`pg_restore` compatível com a versão do servidor; o teste cria e limpa um banco de restauração temporário e um diretório de arquivos independentes, sem acessar armazenamento de objetos real.
5. Envie o PR para o `main` deste repositório, vinculando a Issue relacionada e marcando “Allow edits by maintainers”: em problemas pequenos, o mantenedor pode ajustar direto na sua branch e integrar, sem você precisar rodar tudo de novo. Se ainda está mexendo, abra como rascunho e marque como pronto quando terminar. Em mudanças de página, anexe capturas de tela; quando houver configuração ou passos de atualização, atualize a documentação junto, e o que quem já tem o site implantado precisa fazer ao atualizar vai na seção “Atualização” da [documentação de implantação](docs/deploy.md).

O `main` recebe alterações por PR. Na hora de integrar, organize a branch do PR em um único commit, preservando a autoria correta; para atualizar uma branch já enviada, use `git push --force-with-lease`. A branch deve conter o `main` mais recente e, depois que os checks `check` e `docker` do GitHub passarem nesse commit, o mantenedor integra com rebase, preservando as suas informações de autor.

Não envie `.env`, chaves, senhas de administrador, cookies, dados de produção nem materiais sem autorização; logs e capturas de tela também devem ter os dados sensíveis removidos. O código segue a [licença MIT](LICENSE); as informações sobre marca e materiais de terceiros estão no [NOTICE](NOTICE).
