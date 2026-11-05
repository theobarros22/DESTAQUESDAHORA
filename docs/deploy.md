# Implantação

## Com Docker (recomendado)

Você precisa de uma máquina com Docker (com Compose). Em servidor na nuvem, recomendamos pelo menos 2 núcleos e 4 GB de memória, necessários na construção da imagem.

```bash
git clone https://github.com/theobarros22/DESTAQUESDAHORA.git destaques
cd destaques
git checkout destaques-da-hora
node scripts/init-env.ts --llm-key <sua chave de API do modelo>
```

O `init-env.ts` gera o `.env`, preenche chaves aleatórias e a senha do administrador, e mostra a senha uma única vez. Se a máquina não tem Node, copie `.env.example` para `.env` e preencha você mesmo `ADMIN_PASSWORD` (pelo menos 12 caracteres), `SESSION_SECRET`, `IMG_PROXY_SIGN_SECRET`, `POSTGRES_PASSWORD` (cada uma gerada com `openssl rand -hex 32`) e `LLM_API_KEY`.

Antes de iniciar, confira o `SITE_URL` do `.env`: para testar na própria máquina, deixe `http://localhost:3000`; ao implantar num servidor, troque pelo endereço que o leitor realmente acessa. Por exemplo, acessando pelo IP do servidor (troque o IP de exemplo pelo seu):

```dotenv
SITE_URL=http://192.0.2.10:3000
```

Os links absolutos do RSS, dos links de compartilhamento, do sitemap e do Markdown para Agentes usam este valor e não mudam sozinhos conforme o endereço usado no navegador. Para usar domínio e HTTPS, configure conforme “Domínio e HTTPS” abaixo.

Com a configuração pronta, inicie:

```bash
docker compose up -d --build
```

Depois de iniciar, abra `http://endereço-do-servidor:3000`; a administração fica em `/admin`, e o login usa a senha de administrador. Na primeira inicialização são importadas as fontes de exemplo, e o conteúdo começa a aparecer em um ou dois minutos; os cerca de cem materiais da primeira importação levam cerca de meia hora para ser processados (cada um passa por pré-filtro, pontuação, estruturação, título e resumo, e depois agrupamento).

O `docker compose` sobe cinco contêineres: `db` (PostgreSQL 17), `setup` (a cada inicialização roda primeiro as migrações do banco e os dados iniciais e depois encerra), `api`, `worker` (coleta, processamento por modelos, tarefas agendadas) e `web` (as páginas). O `web` recebe apenas a configuração das páginas, como o endereço do site e o da API, e lê a API por HTTP; o banco, os modelos, as chaves do administrador e os volumes de dados são entregues somente aos contêineres do back-end.

### Em servidores na China continental

- Na construção, o npm usa um espelho local: `docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com`, e depois `docker compose up -d`.
- Se baixar imagens Docker é lento, configure primeiro um acelerador de imagens no Docker.
- Quando fontes do exterior não podem ser coletadas, defina `EGRESS_PROXY_URL` no `.env`: a coleta de fontes e imagens passa por esse proxy, e as chamadas às interfaces de modelos não.
- Para oferecer o site ao público na China continental, é preciso antes concluir o registro ICP, cujo número vai em `icp` de `site/site.ts`.

### Domínio e HTTPS

Primeiro aponte o domínio para o servidor e depois defina no `.env`:

```bash
SITE_URL=https://example.com
SITE_DOMAIN=example.com
PORT=127.0.0.1:3000        # a porta 3000 serve só ao Caddy da própria máquina, sem exposição direta
TRUST_PROXY=true           # o endereço do visitante é lido do cabeçalho enviado pelo Caddy
```

Depois inicie no modo com HTTPS; o Caddy pede e renova o certificado automaticamente:

```bash
docker compose --profile https up -d --build
```

Se você já tem Nginx, não use o Caddy: faça o proxy reverso do site para `http://127.0.0.1:3000`, enviando `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` e `proxy_set_header X-Forwarded-Proto $scheme;` (o login da administração usa isso para saber se o acesso é HTTPS, e sem ele o cookie de login perde o Secure), e defina `TRUST_PROXY=true` no `.env`. O `SITE_URL` precisa ser exatamente o endereço que o leitor acessa: os links gerados, o RSS, as imagens de compartilhamento e o MCP usam esse valor.

Por padrão, o MCP aceita o host de `SITE_URL` e também `localhost`, `127.0.0.1` e `[::1]`. Hosts extras são configurados em `MCP_ALLOWED_HOSTS`, separados por vírgula, por exemplo `extra.example:8443,[2001:db8::1]`. Os nomes de host não diferenciam maiúsculas de minúsculas, o IPv6 precisa de colchetes, e pode haver uma porta decimal de 0 a 65535, que é ignorada na comparação. Configurações com caminho, informações de usuário ou porta inválida não têm efeito. Apelidos como `127.1` precisam ser listados explicitamente; esta configuração só afeta a verificação do Host e não amplia a permissão de Origin do navegador.

Se há um cache à frente, como Nginx ou CDN, ele deve respeitar o prazo de cache que o aplicativo devolve (`Cache-Control`): páginas públicas, dados de navegação, API, RSS, Markdown dos itens, imagens de compartilhamento de relatórios, sitemap, além da página de integração `/api/v1/agent` e de `/openapi-v1.json` (que também precisam ser revalidados depois dos cinco minutos), não devem receber um prazo de cache maior, não devem devolver conteúdo antigo offline depois de vencer, nem reiniciar a vida de uma resposta antiga ao reencaminhá-la; não deixe proxy e CDN acumularem cache de conteúdo dinâmico. O framework não gerencia o CDN de um site próprio nem limpa o cache dele.

### Atualização

**A sincronização do motor de 31 de outubro de 2026** traz três migrações do banco (`0090`–`0092`), que o setup executa ao atualizar com os comandos abaixo: as fontes ganham uma coluna opcional de classe `selection_class`, e o feedback ganha as colunas `kind` (tipo) e `idea` (sugestão agrupada), ambas podendo ficar vazias, sem precisar mudar dados antigos. Não há novas variáveis de ambiente obrigatórias. Mudanças a observar:

- **`industry/selection.ts` ganhou `classes` e `browseFloor`**, veja [Seleção e calibração](selection.md#limiares-industryselectionts); quem alterou esse arquivo deve acrescentar os dois itens ao incorporar, senão a verificação de tipos não passa.
  - `classes`: a classe da fonte e o piso do limiar dela. Na página “Fontes” da administração dá para escolher uma classe para uma fonte oficial, elevando o limiar a pelo menos o número da classe, só para cima, nunca para baixo; fontes sem classe ficam como antes.
  - `browseFloor` (padrão 40): ao navegar em “todas as atualizações” (lista do site, `mode=all` de `/api/v1/items` e `/api/v1/agent/latest`, `all` na lista de últimas do MCP e o RSS “todas as atualizações”), só saem materiais com média não inferior a ele; os que ainda não foram pontuados saem normalmente; com termo de busca, continua buscando em tudo. Para listar tudo como antes, defina `0`.
- **Alertas**:
  - Novo “muitas fontes com falha de coleta”: com a coleta ligada, quando as fontes cuja última coleta falhou são pelo menos 50 e correspondem a 15% ou mais das fontes coletadas recentemente, dispara alerta do nível “leitor afetado”; geralmente é a rota do servidor para a internet ou o proxy que caiu.
  - `WEBHOOK_HUB_URL` e `WEBHOOK_HUB_KEY` opcionais (protocolo em `.env.example`): configurados (e com `FEISHU_INTERNAL_ENABLED=true`), os alertas dos níveis “leitor afetado” e “resolver hoje” são entregues primeiro ao seu próprio serviço de tratamento automático, e só chegam a você se, 1 hora (leitor afetado) ou 3 horas (resolver hoje) depois da entrega, ainda não houver recuperação, ou na terceira entrega do mesmo problema em um dia; o que só você pode tratar (por exemplo, o serviço de modelo recusando chamadas, ou conferir conta ou cota) continua sendo enviado imediatamente. O resumo diário do sistema das 09:00, se aceito por ele, não é mais enviado a você. As mensagens destinadas a você também vão antes ao `/tell` dele e, se não forem aceitas, seguem pelo Feishu. Se ficar mais de 30 minutos sem conseguir entregar, dispara o alerta “o tratamento automático não consegue receber tarefas por ora”, e nesse período os alertas vão direto para você. Sem configurar, tudo fica como antes. As variáveis `AGENT_WEBHOOK_URL` e `AGENT_WEBHOOK_KEY`, que o código lia sem estar documentadas, deixam de ser lidas e o formato da requisição também mudou; quem as usava deve ajustar conforme o `.env.example`.
  - O robô de grupo de alertas (`FEISHU_ALERT_WEBHOOK_URL`) envia uma mensagem por vez e só envia a próxima 600 milissegundos depois que a anterior tem resposta ou falha, sem passar do limite de frequência do robô personalizado do Feishu.
- **Pausa depois que o serviço de modelo recusa chamadas**: uma requisição enviada antes da recusa que depois teve sucesso já não encerra a pausa (ela pode ter usado a última cota); só o sucesso de uma requisição enviada depois da recusa encerra a pausa. Ao recusar, também deixa de apagar de passagem os registros de pausa já vencidos há mais de um dia de outros modelos: se dois modelos fossem recusados ao mesmo tempo, esperariam o bloqueio de linha um do outro e, no deadlock, a recusa seria perdida; uma pausa vencida já não tem efeito, fica em `settings` e é apagada quando aquele modelo tiver a próxima chamada bem-sucedida.
- **Imagens**: as imagens das páginas passam a ser servidas primeiro em AVIF (`<picture>`, e navegadores sem suporte continuam usando o formato original). A versão AVIF é gerada pelo worker em segundo plano, sob demanda, e só é mantida se for pelo menos um décimo menor que o formato original; enquanto não estiver pronta, devolve-se o formato original; o cache de imagens ocupa um pouco mais de espaço. Imagens recusadas ou apagadas pelo site de origem (401, 403, 404, 410) têm o resultado de falha guardado em cache por 6 horas, sem voltar à origem a cada minuto.
- **Backup**: cada arquivo é enviado uma só vez, sob um prefixo (veja [Backup](#backup) abaixo); antes, enviava-se uma cópia por dia para `daily/` e mais uma aos domingos e no dia 1º de cada mês. Quem definiu regras de expiração por prefixo deve conferi-las. Sem anexos, só o `.dump` é enviado, sem gerar um pacote de arquivos vazio.
- **Administração do feedback**: o feedback pode receber um tipo (BUG, sugestão, pergunta, outro); uma sugestão pode ser agrupada sob um nome de sugestão, usando o mesmo nome para a mesma necessidade, e o “banco de sugestões” é ordenado por número de pessoas que a propuseram.

Nova variável opcional `PRIVATE_FEED_HOSTS`: quando o feed ou a lista de uma fonte vem de um serviço próprio na rede interna (por exemplo, um RSSHub), escreva o nome de host dele ali, sem precisar ligar o `ALLOW_PRIVATE_NETWORK_FETCH` do site todo; o uso está em [Fontes](sources.md). Sem definir, o comportamento não muda; não há migração de banco.

Nos períodos dos resumos semanal e mensal, quando os resumos diários estão completos e todos os itens de texto original estão vazios, o período é ignorado automaticamente, evitando repetir o erro a cada meia hora; o arquivo não ganha resumos semanais ou mensais vazios. O primeiro período é verificado a partir do resumo diário mais antigo do site; quando não há itens para reunir, se faltarem resumos diários, se os itens existentes já não puderem ser publicados depois ou se estiverem em correção manual, o erro original é mantido. Não há migração de banco nem mudança de configuração, e passa a valer na próxima verificação agendada depois da atualização.

A correção de vídeos nativos no texto acrescenta controles de reprodução aos vídeos utilizáveis já existentes e remove players vazios, sem regravar o artigo nem chamar modelos. Endereços de mídia que a limpeza da versão antiga já descartou não podem ser recuperados do arquivo; a atualização não reextrai em lote, o texto bem-sucedido existente é ignorado na extração, e a reextração com o mesmo hash de conteúdo também pode manter o HTML original. Os novos textos passam a manter os vídeos nativos conforme a [documentação de fontes](sources.md), com o arquivo continuando a ser buscado direto do site de origem pelo navegador, e endereços assinados podem expirar.

Os gráficos SVG embutidos nas ilustrações do texto passam a manter a descrição escrita pelo site de origem (veja a [documentação de fontes](sources.md)), valendo só para textos extraídos depois; os textos já guardados não mudam, e a atualização não reextrai em lote.

Primeiro faça backup conforme a seção [Backup](#backup) abaixo. Depois da construção, pare os serviços antigos e então execute as migrações e os serviços novos:

```bash
git pull
docker compose build
docker compose stop api worker web
docker compose run --rm setup && docker compose up -d
```

Só inicie os serviços depois que a migração terminar com sucesso; se falhar, veja o erro antes e não continue iniciando. Sites com a configuração de HTTPS continuam usando `--profile https`. A api e o worker antigos precisam parar antes da migração: a migração pode apagar tabelas e colunas, e o código antigo ainda rodando daria erro; o encerramento normal do worker espera terminar as chamadas pagas em andamento (até pouco mais de três minutos). Em implantações sem Docker, atualize também na ordem “backup, construção, parar API/worker/web, migração (`scripts/migrate.ts`), dados iniciais (`scripts/seed.ts`), iniciar”.

Se uma migração nova ficar muito tempo esperando um bloqueio, será informado o nome do arquivo e o tempo limite de espera; trate primeiro a transação que segura o bloqueio e então rode o setup de novo, sem pular a migração nem reescrever o registro de migrações. A criação concorrente de índice interrompida pode deixar um índice inválido: depois de conferir o objeto citado no erro, use `DROP INDEX CONCURRENTLY <nome do índice>` para limpar esse índice que falhou e rode de novo; um índice válido de mesmo nome mas definição diferente exige conferir primeiro a diferença. Essas proteções não mudam a ordem de atualização do Docker acima, e atualizar a partir de versões muito antigas ainda pode executar migrações destrutivas do passado.

A seguir, da mais nova à mais antiga, o que observar em cada atualização.

O alerta de resumo diário ausente é acompanhado pela data concreta no horário do site e não se recupera sozinho ao passar da meia-noite; só se envia o aviso de recuperação se o resumo diário correspondente existir. A verificação de novas ausências cobre os últimos 7 dias do calendário (incluindo hoje), não antes do resumo diário mais antigo ou do registro de execução de reports.compose; sem registros históricos, só verifica hoje. As datas já alertadas continuam sendo acompanhadas durante esses 7 dias, e desligar a coleta ou os modelos, ou o período de tolerância na partida do worker, não faz a ausência ser tratada como recuperada; as que passam de 7 dias ainda sem resumo diário recebem uma mensagem “não foi possível completar, parando os lembretes” e deixam de ser lembradas. O estado antigo de report.daily é migrado automaticamente pelo horário do primeiro alerta, mantendo o intervalo de lembretes. O alerta de duas horas depois da edição, o lembrete de hora em hora e a chave do Feishu continuam como antes; não há migração de banco. Um responder próprio que compare exatamente com o antigo `report.daily` precisa passar a reconhecer a chave de data `report.daily:YYYY-MM-DD`.

#### Troca de palavras no texto do leitor (9 de outubro de 2026)

Sem migração e sem nova variável de ambiente obrigatória. O pacote do setor ganhou `industry/wording.ts` (palavras que o texto do leitor não usa; no modelo, está vazio) e o prompt `mend-wording.md`; ao incorporar, esses dois arquivos chegam com a atualização e não conflitam com o seu pacote do setor. Com a lista vazia, não se confere nem se faz chamada extra ao modelo; depois de escrever palavras, os títulos, resumos e motivos de recomendação que as usam ganham uma chamada extra ao modelo (etapa “troca de palavras”, e a variável opcional `WORDING_MODEL` permite escolher um modelo só para ela). Explicação em [Adapte para o seu setor](customize.md).

#### Nem todas as entradas precisam estar na navegação

Sem migração e sem nova variável de ambiente. O `site/site.ts` ganhou `NAV.hidden` (por ora só aceita o ranking de destaques `"/hot"` e os tópicos `"/topics"`, veja [Adapte para o seu setor](customize.md)); o framework o lê de `@aihot/site`, e **sites que mantêm o próprio `site/site.ts` devem acrescentar `NAV` conforme o modelo ao incorporar**, senão a verificação de tipos não passa. No modelo está vazio, e a navegação fica como antes; ocultar uma entrada não desativa a página nem a interface pública.

#### Exibição de postagens originais e sincronização do motor (6 de outubro de 2026)

Sem novas variáveis de ambiente obrigatórias nem migração de banco. Sites que mantêm o próprio `site/site.ts` precisam acrescentar `REPORTS.quiet`, que pode ser comparado com a configuração de exemplo: quando há materiais julgados no período do resumo diário mas nenhuma grande novidade, a edição sai normalmente, usando estas duas frases como título e abertura; `{start}` e `{end}` na abertura são o início e o fim do período. Se nenhum material foi julgado, continua contando como falha de coleta ou de julgamento, sem fingir um dia tranquilo.

Postagens do X com texto vazio e só um link mantêm o link, as imagens e a citação originais, sem chamar o modelo de redação ou de tradução; quando a fonte permite exibir o texto completo, postagens só de imagem também podem ser exibidas, e as permissões de exibição e redistribuição atuais continuam valendo. Artigos longos do X com texto real obtido são processados normalmente. Traduções antigas também deixam de aparecer nas páginas públicas dessas postagens originais. Postagens que já tinham gerado título e resumo errados podem, depois da atualização, ter o conteúdo público reconstruído com `publishArticle(id)` de `packages/backend/src/publication/publish.ts`, sem nova chamada ao modelo.

O `subscriptions/listen` do MCP agora responde de imediato HTTP 404 e JSON-RPC `-32601 Method not found`. O serviço nunca envia mudanças ativamente, e as chamadas de ferramentas comuns funcionam normalmente; o cliente que receber essa resposta não deve tentar criar uma assinatura permanente.

Os testes que não precisam de banco passaram a ser `*.standalone.test.ts`; o `npm test` continua rodando todos os testes do back-end, criando cópias do banco só para os arquivos que precisam dele. É possível rodar só esses testes com `npm run test:standalone`.

#### Correções da comunidade, regras de horário e otimizações de leitura (4 de outubro de 2026)

A versão da interface pública continua 4.0.0. Sem novas variáveis de ambiente obrigatórias; há uma opcional nova, `LLM_REASONING_TOKENS`, veja o item `site/models.ts` abaixo.

**As chaves só aceitam `true`**: todas as chaves `*_ENABLED` do `.env` (`COLLECT_ENABLED`, `MODEL_CALLS_ENABLED`, `FEISHU_*_ENABLED`, `INDEXNOW_SUBMIT_ENABLED` etc.) só ligam quando escritas como `true` minúsculo. Antes, `1` ou `TRUE` também contavam como ligado; agora todos contam como desligado; antes de atualizar, confira o `.env` e troque por `true`.

**Migrações**: sete migrações novas; basta esperar o setup terminar, seguindo os passos acima. Nenhuma apaga dados, reescreve artigos ou vetores existentes, nem chama modelos; as migrações são registradas pelo nome completo do arquivo, e arquivos de mesmo número com nomes diferentes são executados cada um.

- `0055_publication_selected_published_idx.sql`, `0056_analyses_composite_id_idx.sql`, `0056_publications_pool_category_timeline_idx.sql`, `0057_publications_pool_channel_timeline_idx.sql`: criam índices de consulta de forma concorrente, sem bloquear leituras e escritas normais.
- `0056_publication_release_selection_stats.sql`, `0057_analyze_publication_release_selection.sql`: criam e coletam estatísticas de consulta das listas públicas.
- `0083_publications_selected_source_idx.sql`: cria de forma concorrente o índice de cobertura que conta a seleção por fonte, reduzindo as leituras nas estatísticas da administração.

Junto com esses índices, esta versão reduziu o custo no banco da leitura pública e da recuperação de eventos, sem mudar o conteúdo das interfaces, o peso da busca nem o alcance dos candidatos a evento.

**Sites que alteraram estes arquivos devem compará-los com os novos ao incorporar**:

- `site/site.ts` ganhou alguns itens:
  - `EDITION_TIMES`, `EDITION_WHEN`: horários de edição dos resumos diário, semanal e mensal, que antes estavam fixos no código; o agendamento, a janela de horário do resumo diário, o alerta de edição ausente e os textos que citam horário os leem. Os arquivos em `public/` usam os marcadores `{{dailyTime}}`, `{{weeklyTime}}`, `{{monthlyTime}}`.
  - `ITEM_COPY`: como se chama o motivo da recomendação e se a nota aparece nas páginas e nas imagens de compartilhamento.
  - `REPORTS.descriptions`, `entry`, `metricUnits`, `shareUnit`: a descrição das páginas de relatório e as expressões usadas na diagramação.
  - Os textos de `ABOUT` e `CARDS` que citam o horário de edição e o motivo da recomendação passam a referenciar os itens acima.
  - `DEPLOYMENT.directImageHosts` foi renomeado para `directFetchHosts`, e a coleta e as imagens compartilham essa lista de conexão direta.
  - `SITE.feedbackLead`, `SITE.feedbackEmailHint`: a frase sob o título da página de feedback e a dica do campo de e-mail, que antes estavam fixas no código.
  - `SITE.psb`: número opcional de registro de segurança pública; se não foi feito ou não se aplica, use `null`.
  - Em `ABOUT.lead`, não se escreve mais espaço dos dois lados de `{sources}`; a página o acrescenta automaticamente.
- `site/models.ts`: os parâmetros da chamada de pontuação agora são configurados pelo `scoreCall` de cada predefinição nomeada; se você mantém `glm-5.3-flash-selection`, sincronize a temperatura, a cota de saída e o tempo limite do exemplo. Modelos personalizados que não definem este item usam os valores padrão do motor.
- O `ModelPreset` de `site/models.ts` e o `Founder` de `site/site.ts` passam a ser importados de `@aihot/contracts/site-config`, com os valores de configuração do site mantidos; quem personalizou esses dois arquivos deve sincronizar as importações de tipo, para não perder os campos opcionais novos do motor.
- Se uma migração de banco encontrar um `pg_dump` em exportação, ela espera primeiro, por no máximo o mesmo tempo do esvaziamento do worker; passado o limite, sai antes de executar essa migração, e deve-se rodar de novo o comando de atualização depois que a exportação terminar. Outros bloqueios continuam dando erro rápido.
- A migração apaga a coluna `translation_attempts.request_tag`, já desativada; o texto traduzido, os registros de tentativas e os recibos pagos são mantidos. A precisão original do horário de publicação da fonte é guardada à parte, e a precisão que não puder ser determinada nos materiais antigos fica desconhecida, sem tratar automaticamente a meia-noite como se a fonte só tivesse escrito a data.
- `site/models.ts`: a cota de modelos de raciocínio passou a ser configurada explicitamente. Defina `LLM_REASONING_TOKENS` no modelo padrão e `reasoningTokens` nos modelos nomeados. Antes, só os modelos nomeados cujo nome terminava em `-think` ganhavam 4000 a mais; isso foi removido, e quem adicionou modelos desse tipo deve acrescentar `reasoningTokens: 4000` para manter a cota original. Quando um modelo de raciocínio esgota a cota, o erro informa `finish_reason=length` e qual item ajustar.
- `industry/prompts/story-digest.md`: a visão geral do evento mudou de forma de escrever: a primeira frase explica a mudança central e a conclusão atual, depois acrescenta o contexto necessário, em parágrafos curtos, sem recontar por data a linha do tempo abaixo, sem comentar a própria reportagem e sem fixar o setor no texto. As sínteses existentes não são reescritas em lote e vão passando ao novo estilo com as novas reportagens; para reescrever alguns eventos de imediato, veja a última seção da [avaliação da síntese](story-digest-evaluation.md) (`rewriteStoryDigest`, uma chamada de modelo por evento).
- Quem mantém um arquivo Compose próprio pode remover `LOCAL_ROUTER_URL`: o pré-aquecimento das imagens de compartilhamento agora reutiliza diretamente o renderizador do back-end, sem requisitar uma porta local fixa, nenhum código lê mais este item, e o `docker-compose.yml` incluído já o removeu. O endereço, o formato e as convenções de cache das imagens de compartilhamento não mudam.

**Coleta e horário de publicação**:

- **Depois da primeira importação, o acervo da fonte não é mais coletado**: antes, depois da primeira importação de uma fonte nova, a segunda coleta trazia todos os itens antigos restantes do feed como conteúdo histórico, com análise paga item a item (só a fonte de exemplo chegava a mais de mil de uma vez). Agora as coletas seguintes só trazem itens com horário de publicação até 48 horas antes da primeira importação da fonte, ou depois; os sem data são coletados normalmente, e contas do X não são afetadas; veja “Regra: conteúdo antigo não inunda a tela” em [Fontes](sources.md#regra-conteúdo-antigo-não-inunda-a-tela). Itens antigos que já tinham entrado antes da atualização são arquivados pela data original, sem entrar em “hoje” nem no resumo diário, e a análise deles já terminou há tempo, sem nada a tratar.
- **Material novo sem horário de publicação confiável não é publicado de imediato**: fica fora das listas públicas, da seleção, dos relatórios, dos destaques e dos envios, e só se julga se é novo ou antigo depois de ler a data na fonte original ou na página do texto. Enquanto a data é desconhecida, a página do artigo, os dados estruturados e o Markdown para Agentes mostram “hora de inclusão”, o RSS não escreve `pubDate`, e o OpenAPI informa que o `publishedAt` da linha do tempo do evento e das notas do resumo diário é, nesse caso, a hora de inclusão.
- **Horários sem fuso nas interfaces JSON** (como `2026-09-30 17:43:58`) são lidos pelo `publishedAtUtcOffset` da fonte, padrão `+08:00`. Antes eram lidos pelo fuso do servidor, que no Docker é UTC, então os novos itens das fontes desse tipo já existentes apareciam 8 horas adiantados, e passam a ter o valor correto.
- **A data da página do artigo usa o fuso da mesma origem**: o preenchimento de data da página de detalhe e a extração de texto usam primeiro `detail.publishedAtUtcOffset` e, se não definido, herdam o `publishedAtUtcOffset` da fonte, e por fim o padrão `+08:00`. Vale só para coletas e preenchimentos de data posteriores, sem reescrever em lote os horários de publicação existentes.
- **Complemento dos detalhes**: datas, títulos e resumos que falharam ou passaram do limite de tentativas da rodada são completados nas coletas seguintes, e o texto já confirmado fica como está; quando a requisição à fonte tem sucesso mas deixa de trazer data, título ou texto, também são completados e registrados na saúde da fonte. As regras de detalhe do Jina precisam combinar com o formato realmente devolvido; a configuração de ponto de partida fixo da coleta, de seções de data do Intercom e de descrição de vídeo está em [Fontes](sources.md).
- **Páginas de reprodução de vídeo não valem como texto**: vale para todas as fontes; as páginas de reprodução do YouTube e do Vimeo deixam de ser coletadas como texto de artigo, e as páginas de vídeo do YouTube deixam de ser tratadas como imagem. A descrição de vídeo do RSS só serve de resumo, e o texto real fornecido diretamente pelo feed é mantido. A atualização não apaga nem reanalisa em lote os textos existentes; registros antigos de vídeo misturados com a navegação do player devem ser conferidos um a um, e na página de detalhe do “diagnóstico de conteúdo” da administração podem ser marcados como só resumo, parando de exibir o texto errado.
- **RSS**: em feeds de texto cujo resumo é, confirmadamente, o texto completo, é possível definir `summaryIsBody` (o `summary` do Atom também conta). Em episódios de podcast sem página, o link do original passa a ser o arquivo de áudio ou de vídeo, sem tentar coletar uma página.
- **A pré-visualização e a coleta oficial usam o mesmo conjunto de filtros**: a “pré-visualização da coleta” da administração também aplica prefixo de endereço, categoria, palavras de ruído, reescrita de endereço e `publishedAfter`, e os itens vistos na pré-visualização são os que a coleta oficial vai guardar.
- **Com a coleta desligada, os ícones das fontes não são mais buscados**: quando `COLLECT_ENABLED` não é `true`, a tarefa das 04:40 que busca os ícones das fontes também para, sem acessar os sites das fontes.
- **Datas históricas já verificadas podem ser corrigidas**: o script de operação primeiro chama `previewPublicationDateCorrection` de `admin/content.ts` e depois chama `correctPublicationDate` com a versão e o valor de verificação dados pela pré-visualização, registrando quem operou e o motivo. Só aceita correções explícitas em que a data antiga e a nova ficam antes da janela de sete dias; revisões do material, seleção e agrupamento são mantidos, sem refazer modelos. Se o material ou a data já mudou, ou se esta correção alteraria outras decisões públicas, a operação é recusada e exige nova conferência; não há preenchimento em lote nem nova interface pública.
- **A nota pública pode ser corrigida ou revogada manualmente**: o detalhe do conteúdo na administração oferece “pelo modelo”, “revogar nota” e “nota manual”. A nota manual aceita 0–100, revogar a nota deixa o valor público como `null`, e limpar a substituição restaura a nota do modelo já guardada. A correção exige motivo e conferência de versão, preserva a análise original e o registro de auditoria, e atualiza juntos o site, a API, o RSS, o Markdown para Agentes e o MCP, sem refazer modelos. Artigos existentes não têm a nota alterada nem são selecionados de novo em lote por causa da atualização.

**Saídas públicas**:

- **O filtro por categoria segue `PUBLIC_CATEGORIES`**: o `category` da API, do RSS e do MCP considera todas as categorias que contam como essa classe nas interfaces públicas. Em sites que não fundem categorias (o padrão), consultar por `tip` já não traz opiniões; setores sem categoria `tip` também passam na verificação de tipos.
- **Relatórios antigos continuam precisando de revalidação**: data, semana e mês determinam qual edição é, mas não significam que o conteúdo é permanentemente imutável. O relatório mantém o título e o resumo escritos na edição, enquanto o nome da fonte e a hora da citação acompanham os dados públicos atuais; citações retratadas e a apresentação e a capa que dependem delas deixam de ser distribuídas. Clientes que guardam cópias de relatórios pedem de novo com `If-None-Match` quando o `Cache-Control` vence.
- **Sites com cache de Nginx ou CDN configurado por conta própria devem conferir as regras**: confira segundo o final de [Domínio e HTTPS](#domínio-e-https) e, ao atualizar, limpe o cache existente de proxy e CDN desses caminhos, incluindo a página de integração `/api/v1/agent` e `/openapi-v1.json`.
- **Se a reconstrução do sitemap falhar, o arquivo antigo não é mais usado indefinidamente**: o processo, a cópia em disco e a resposta HTTP compartilham o prazo original de cinco minutos, e, vencido e sem conseguir reconstruir, devolve `503` e `Retry-After`. O MCP continua usando `no-store`; o conteúdo da API e dos Agentes é revalidado ao vencer.

**Ferramentas e correções**:

- **Avaliação da síntese**: `scripts/eval-story-digests.ts` exporta eventos reais do banco e roda lado a lado, no mesmo lote de eventos, o prompt atual e um prompt candidato, veja [Avaliação da síntese](story-digest-evaluation.md). Os três scripts de avaliação compartilham `scripts/eval-tools.ts`; `--n`, `--concurrency` e nomes de modelo errados em `eval-selection.ts` dão erro diretamente.
- **Migrações não bloqueiam leitura e escrita**: cada arquivo de migração nova contém uma única instrução que pode rodar online, sem preencher ou reescrever a tabela inteira, e os índices usam `CREATE INDEX CONCURRENTLY IF NOT EXISTS`; o CI verifica com `scripts/check-migrations.ts`. A manutenção de estatísticas só atinge tabelas e colunas explícitas, e as regras estão em [Arquitetura](architecture.md#migrações-do-banco-de-dados).
- As requisições MCP têm limite de tamanho, e o log de erros remove credenciais.
- A barra lateral do desktop mostra uma barra de rolagem fina quando ampliada.
- Os testes reconhecem a requisição pelo prompt realmente usado em cada etapa e leem os limiares de `industry/selection.ts`, de modo que, ao mudar de setor e reescrever prompts e limiares, deixam de dar falso alarme; os testes de arquitetura deixam de ser afetados pelo separador de caminho.

#### Arquivos do site vão para `site/` (4 de outubro de 2026)

A interface pública não mudou, e a versão continua 4.0.0.

- **Os arquivos do próprio site saíram de `industry/` e foram para `site/`**: `site.ts`, `models.ts`, `brand/`, `pages/`, `public/`, `changelog.json`. `industry/` ficou só com o conhecimento do setor: `taxonomy.ts`, `topics.json`, `sources.json`, `prompts/`, `selection.ts`. Quem alterou esses arquivos deve mover as alterações para os arquivos de mesmo nome em `site/` ao incorporar.
- **`site.ts` ganhou alguns itens**, todos opcionais: `SITE.github`, `SITE.llmsIntro`, `SITE.rootIcons`, `POLICY.terms.license`, `POLICY.terms.headers`, `ABOUT.termsAnchor` (os cartões de QR code podem ter `alias`), além de `ACCESS`, `ADMIN`, `DEPLOYMENT`, `FEED_COPY`, `PUBLIC_CATEGORIES`, com explicação em [Adapte para o seu setor](customize.md). `PUBLIC_CATEGORIES` substitui o `publicAs` da versão 4.0.0: quem escrevia `publicAs: "tip"` na categoria deve escrever em `PUBLIC_CATEGORIES.merge` (a chave é a key dessa categoria, e o valor é `"tip"`).
- **`DEPLOYMENT.requiredSecrets`** é a lista de credenciais verificadas adicionalmente na partida da API em produção, vazia por padrão; a sessão básica, a assinatura de imagens e a verificação do login do administrador continuam valendo. Só preencha quando a sua implantação exigir que uma integração opcional esteja configurada.
- **Um recurso que pertence só ao seu site pode virar módulo**: coloque em `modules/<nome>/`, ative na lista de `site/modules/`, veja “Módulos” em [Arquitetura](architecture.md). O framework em si não traz módulos.
- **A página de integração de Agentes abre o MCP por padrão**, e lista três formas de integração: MCP, RSS e API. A interface Markdown para Agentes continua em `/api/v1/agent`, acessível pelo “Guia de uso para Agentes” no pé da página.
- **O proxy de imagens pode ter limite de tráfego**: `IMGPROXY_UPSTREAM_MB_PER_MINUTE`, `IMGPROXY_UPSTREAM_GB_PER_DAY` (ou `DEPLOYMENT.imageUpstreamBudget` em `site.ts`), sem definir por padrão.
- **Correções**: os mesmos dados dão sempre os mesmos bytes (em empates na ordenação acrescenta-se uma ordem única, e o ETag da API e do RSS deixa de mudar sem motivo); as requisições que o site repassa à api deixam de levar cabeçalhos salto a salto, e `Connection: close` não faz mais o POST seguinte falhar; as formas de integração no `llms.txt` seguem o número real, sem escrever quatro.

#### Atualização para a interface pública 4.0.0 (3 de outubro de 2026)

- **O ranking de modelos, o monitor de reinício do Codex e a cronologia das páginas de tópicos deixam de fazer parte do framework**, ficando só no AIHOT. As páginas (`/leaderboard`, `/codex-reset`), as interfaces (`/api/v1/codex-resets`, `/api/v1/codex-resets/recent`, `/api/v1/agent/codex-resets`) e a ferramenta MCP `<prefixo>_get_codex_resets` foram removidas, e a versão do MCP e de `/openapi-v1.json` sobe para 4.0.0. A migração `0053` apaga as tabelas deles (`lb_*`, `monitor_*`, `fx_rates`) e as configurações; as tarefas agendadas e as filas de execução delas são retiradas automaticamente quando o worker inicia, e os registros de execução da administração são mantidos; quem quer guardar esses dados deve fazer backup antes de atualizar. O logotipo da página de tópicos de uma empresa passa a ser a inicial do nome da empresa.
- **O pacote do setor teve algumas mudanças**; sites que alteraram `industry/` devem acrescentar, comparando com os novos arquivos, ao incorporar:
  - `site.ts` ganhou `topicsTitle`, `feedbackExample`, `keywords`, `since`, `interfaceVersion`, `POLICY` (nome e apresentação das duas páginas de regras de uso e aviso de privacidade, e se as postagens do X contam como texto completo), `ABOUT.description`, `ABOUT.sourcesFallback`, `AGENT`, `REPORTS`, `ALERTS`, `SOURCE_DEFAULTS`, `COMMUNITY_FEEDS`, `CARDS`; os dois cartões de QR code do bloco do autor ganharam `kind`, e `ABOUT.copyright` virou dois trechos, antes e depois do link da página de feedback.
  - Novo `models.ts`: os modelos nomeados e qual é o padrão de cada etapa, que antes estavam no código.
  - O logotipo no canto superior esquerdo das páginas saiu de `apps/web/app/components/Logo.tsx` para `industry/brand/Logo.tsx` (depois foi para `site/`, veja acima).
  - Novo `public/`: `robots.txt` e `manifest.webmanifest`, que antes eram gerados no código, e a descrição OpenAPI, que antes estava em `reference/`, agora são arquivos daqui. O `/.well-known/security.txt`, que era gerado quando se preenchia `contactEmail`, agora exige que você ponha o seu `public/.well-known/security.txt` (depois foi para `site/`, veja acima).
  - Removidos `features.ts`, `chronicle.ts` e `chronicles/`; `orgNames`, `leaderboardProvider` e `chronicleTerms` em `topics.json` deixam de ser usados e podem ser apagados.
  - As categorias de `taxonomy.ts` podem ter `feedLabel` (o nome no título do RSS por categoria; o site de exemplo usa expressões como “Modelos de IA”); `ENTITIES` ganhou algumas empresas. Na época, a categoria ainda podia ter `publicAs`, para fundir-se a outra nas interfaces públicas; esse campo foi removido depois e virou `PUBLIC_CATEGORIES.merge` de `site/site.ts` (veja acima), e escrever `publicAs` de novo não passa na verificação de tipos.
- **O limite de requisições da interface de envio pode ser configurado**: quantas vezes por minuto cada cliente pode enviar em `/api/ingest/items` é decidido por `INGEST_RATE_LIMIT`, padrão 10 no `docker compose`, como antes; sem Docker, o padrão é sem limite, e se não houver proxy limitando à frente, defina no `.env`.
- **Variáveis de ambiente que deixam de ser usadas**: `ARTIFICIAL_ANALYSIS_API_KEY` e `MONITOR_MODEL`, que podem ser apagadas do `.env`.

#### Atualização para a interface pública 3.0.0 (3 de outubro de 2026)

- **As válvulas de segurança vêm desligadas por padrão**: `COLLECT_ENABLED` e `MODEL_CALLS_ENABLED` só ligam quando escritas como `true`, e o que não estiver escrito conta como desligado. O `.env` gerado por `scripts/init-env.ts` já tem essas duas linhas; quem escreveu o próprio `.env` sem elas deve acrescentá-las, senão depois da atualização a coleta e as chamadas a modelos deixam de acontecer.
- **As interfaces dos resumos semanal e mensal mudaram de forma**: a lista e cada edição de `/api/v1/weeklies` e `/api/v1/monthlies` trazem `periodStart` e `periodEnd`, o corpo virou `sections[]` (cada seção com `label`, `summary`, `items`), não há mais `title` e `themes`, e o `limit` da lista é no máximo 60. Programas que leem essas duas interfaces precisam acompanhar; a versão do MCP e de `/openapi-v1.json` sobe junto para 3.0.0.
- **Na saída para máquinas da seleção, uma notícia vale uma entrada**: no `mode=selected` da API, na interface de sincronização e no RSS da seleção, de uma mesma notícia só fica a reportagem representante, e as demais aparecem como `remove` nas mudanças da sincronização (em `mode=all` continuam). Reportagens que já estavam selecionadas antes da atualização não são reorganizadas; só se fundem quando essa notícia ganhar outra reportagem publicada.
- **A seleção espera a confirmação de deduplicação**: o material com nota suficiente só entra na seleção depois que o agrupamento confirma que não é duplicata de uma notícia já na seleção e que traz informação nova; até a confirmação, fica só em “todas as atualizações”. Quando o modelo usado no agrupamento responde fora do formato, o material fica parado ali, e dá para ver na página “Execução” da administração.
- **Primeira mão só pela classificação**: `T1` já é primeira mão, e `first_party` deixa de ser definido à parte; fontes `T1_5` e `T2` que antes eram marcadas à parte como primeira mão deixam de contar como primeira mão, e quem quiser que contem deve passá-las para `T1`.
- **O pacote do setor ganhou alguns itens**: `taxonomy.ts` ganhou `RELEASE` e `PLAIN_TERMS`, as categorias de comentário levam `commentary: true`, `ENTITIES` pode ter `otherNames`, e `CATEGORY_BY_ITEM_TYPE` deixa de ser usado. Sites já trocados para outro setor devem, ao incorporar, acrescentar conforme [Adapte para o seu setor](customize.md).
- **Os tópicos só leem `industry/topics.json`**: a migração apaga a tabela `topics` do banco. Tópicos que só foram alterados no banco e não no arquivo devem ser escritos no arquivo antes de atualizar. Os tópicos de empresa só consideram `entityId`, e `related` deixa de ser usado.
- **O resumo diário deixa de chamar modelos**: o resumo diário é montado por regras, os resumos semanal e mensal são compilados a partir dos diários, e o modelo só escreve a visão geral e a apresentação das seções; as edições já publicadas não são reescritas.
- **Os prompts mudaram**: em `industry/prompts/`, `structure.md`, `group-*.md`, `story-digest.md` e `report-period.md` ganharam uma redação nova, `report-daily-lead.md` foi removido e `report-period-sections.md` foi acrescentado. Quem alterou esses prompts deve passar as próprias alterações comparando com os novos.
- **Scripts removidos**: `scripts/delete-sources.ts`, `scripts/regroup-events.ts`, `scripts/enqueue-analysis.ts`. Pause na administração as fontes que não quer; a reavaliação e o reagrupamento de um artigo são feitos abrindo esse artigo em “diagnóstico de conteúdo” da administração.
- **A sessão do administrador fica vinculada à forma de login** (migração `0041`): ao atualizar de uma versão que ainda não tinha vínculo de sessão, as sessões antigas sem vínculo precisam fazer login de novo. Bancos que já tinham experimentado a migração de vínculo de sessão podem atualizar direto, com as colunas e os vínculos existentes preservados, sem precisar alterar manualmente o registro de migrações. As regras seguintes estão em “Sessões do administrador e mudanças de configuração” abaixo.
- **O `/agent` das versões 3.x abre o Markdown para Agentes por padrão**, e a explicação de integração do MCP fica em `/agent?tab=mcp`; a página de integração atual está em “Arquivos do site vão para `site/`” acima.
- **O grupo de conteúdo do Feishu só recebe a seleção das fontes `T1` e `T1_5`.**

### Backup

Configure `DB_BACKUP_STORE_*` no `.env` (qualquer armazenamento de objetos compatível com S3), e todo dia às 04:10 é feito backup automático para lá. Os quatro itens `DB_BACKUP_STORE_SECRET_ID`, `DB_BACKUP_STORE_SECRET_KEY`, `DB_BACKUP_STORE_BUCKET` e `DB_BACKUP_STORE_REGION` precisam ser preenchidos; sem `DB_BACKUP_STORE_DOMAIN`, o endereço é montado no formato do Tencent COS (`<nome do bucket>.cos.<região>.myqcloud.com`); com outro armazenamento compatível com S3, preencha `DB_BACKUP_STORE_DOMAIN` com o domínio de acesso do bucket (com o nome do bucket, por exemplo `<nome do bucket>.s3.<região>.amazonaws.com` no AWS S3).

Um backup completo contém o `.dump` do banco e o pacote de arquivos `.tar.gz` com o mesmo carimbo de tempo, e o nome do arquivo vem do nome do banco: no Docker o banco se chama `aihot`, então são `aihot-<horário>.dump` e `aihot-files-<horário>.tar.gz`. O pacote de arquivos guarda `uploads/` e os `feedback-screenshots/` que ainda estão locais, sem incluir o cache de imagens nem o diretório de backups locais; quando esses diretórios não têm arquivos, só há o `.dump`. As imagens já encaminhadas ao Feishu só mantêm no banco a referência externa, e o pacote não guarda as imagens que estão no Feishu.

Cada arquivo é enviado uma só vez, sob um prefixo: no dia 1º de cada mês vai para `monthly/`, aos domingos para `weekly/` e nos outros dias para `daily/`. É possível definir prazos de expiração diferentes por prefixo no armazenamento de objetos.

Para restaurar, recupere os dois arquivos do par (se só houver o `.dump`, restaura-se só o banco): use um `pg_restore` compatível com a versão do banco para restaurar o `.dump` em um banco vazio e depois extraia o pacote de arquivos na raiz do diretório de dados (`/data` no Docker; sem Docker, `AIHOT_DATA_DIR`, padrão `.data`), mantendo a estrutura de subdiretórios do pacote e garantindo que o processo em execução consiga ler esses arquivos. Restaurar só o banco não recupera as capturas de tela de feedback ainda referenciadas por `local:`; arquivos que um backup antigo não incluía também não podem ser recuperados pela referência do banco.

A exportação manual abaixo contém só o banco, sem os diretórios de anexos acima:

```bash
docker compose exec -T db pg_dump -U aihot aihot | gzip > destaques-$(date +%F).sql.gz
```

Todos os dados ficam em três volumes do Docker: `db` (banco), `data` (imagens enviadas, cache de imagens, backups locais) e `caddy` (certificados). O `docker compose down` não os apaga; o `docker compose down -v` apaga.

### Ver os logs

```bash
docker compose logs -f --tail 100 api worker web
```

A página “Execução” da administração mostra o resultado mais recente de cada tarefa agendada, e a página “Fontes” mostra a situação de coleta de cada fonte.

### Sessões do administrador e mudanças de configuração

A sessão fica vinculada à forma de login, às credenciais do administrador no momento do login ou à identidade do Feishu. Depois de mudar a senha do administrador, a lista de administradores do Feishu ou o segredo da sessão, reinicie todos os processos da API para que carreguem a mesma configuração nova; só editar o arquivo de configuração não significa que os processos em execução já a aplicam, e processos com código ou configuração antigos misturados não conseguem dar uma revogação de permissão uniforme.

Quando a configuração efetiva muda, a sessão por senha deixa de aceitar a autorização da senha antiga, e a sessão do Feishu confere a lista atual pelo union ID ou e-mail realmente obtido no login (basta que um dos dois continue autorizado). Desativar o aplicativo de login do Feishu ou trocar o ID do aplicativo invalida as sessões do Feishu; só rodar o secret do mesmo aplicativo não derruba as sessões do Feishu que continuam autorizadas. Rodar ou remover `SESSION_SECRET` invalida os dois tipos de sessão.

Uma sessão cuja invalidez é confirmada na autenticação é apagada, e restaurar a configuração antiga não a ressuscita. O sistema não registra o histórico global de mudanças de credenciais: se uma mudança de configuração nunca foi carregada por um processo, ou nunca foi observada por uma verificação de sessão antes de ser restaurada, não é possível, a partir dela, revogar sessões retroativamente.

## Quanto custa

- **Modelos**: cada material novo passa antes por um pré-filtro; os que passam recebem duas pontuações, uma estruturação e um título e resumo, e depois o agrupamento (só chama o modelo quando há reportagens parecidas), além da síntese de eventos, da visão geral dos resumos semanal e mensal e da tradução do texto completo da seleção. Postagens do X com texto vazio e só um link não chamam o modelo de redação nem de tradução. O resumo diário é montado por regras, sem chamar modelos. Numa execução local de teste com as fontes de exemplo, os 152 materiais da primeira importação usaram cerca de 930 chamadas de modelo. Depois, quanto se usa por dia depende de quantos itens as suas fontes atualizam por dia. A página “Modelos e avaliação” da administração mostra o número de chamadas e de tokens de entrada e saída de cada etapa.
- **Coleta paga** (X, WeChat, Jina): cobrada por requisição, desativada por padrão, e só é usada se você preencher a chave.
- Todos os serviços pagos têm limites de chamadas por minuto, por hora e por dia (administração, “Configurações → Limites de requisições pagas”), e ao passar o serviço pausa, sem estourar a conta da noite para o dia. Colocar 0 desativa o serviço imediatamente.

Para economizar, siga esta ordem:

1. Veja primeiro a página “Modelos e avaliação” da administração, onde estão o número de chamadas e os tokens de entrada e saída de cada etapa, e encontre o maior item antes de mexer.
2. Confirme que o modo de raciocínio está desligado: o processo de raciocínio é cobrado como token de saída, e o `LLM_EXTRA_JSON` do `.env.example` explica como desligar.
3. Troque por modelos mais baratos as etapas de maior volume: no `.env` dá para escolher etapa por etapa (`PREFILTER_MODEL`, `SCORE_MODEL`, `STRUCTURE_MODEL`…), e também pela página “Modelos e avaliação”. Antes de trocar o modelo de pontuação, compare no mesmo lote de amostras com `scripts/eval-selection.ts`, para não economizar e passar a selecionar mal.
4. Deixe entrar menos material irrelevante: o gasto é basicamente proporcional ao número de itens que chegam por dia. Em sites de notícias gerais, assine só as seções relacionadas à sua área, reduza a frequência de atualização na página “Fontes” e pause as fontes de grande volume que raramente entram na seleção.

## Sem Docker

Você precisa de Node.js 24.11 ou superior e PostgreSQL 16 ou 17, em Linux ou macOS; no Windows, rode dentro do WSL2 ou use o método Docker acima.

```bash
npm ci
node scripts/init-env.ts --llm-key <sua chave de API do modelo>
createdb destaques
```

Acrescente ao `.env`:

```bash
DATABASE_URL=postgres://seu-usuario@127.0.0.1:5432/destaques
API_BASE_URL=http://127.0.0.1:3001
```

Depois:

```bash
node --env-file=.env scripts/migrate.ts
node --env-file=.env scripts/seed.ts
npm run build -w @aihot/web

NODE_ENV=production node --env-file=.env apps/api/src/main.ts          # interface (API), porta 3001
NODE_ENV=production node --env-file=.env apps/worker/src/main.ts       # tarefas em segundo plano
cd apps/web && NODE_ENV=production node --env-file=../../.env server.ts   # páginas, porta 3000
```

Os três processos precisam de `NODE_ENV=production`. A api e o worker sem ele rodam como em desenvolvimento: na partida não verificam as chaves de produção nem a senha do administrador, e o acesso sem login por `DEV_AUTH_ROLE` também vale.

Os três processos precisam ficar sempre em execução; em produção, use systemd ou pm2 para mantê-los (na configuração do supervisor também defina `NODE_ENV=production`). Ao parar o worker, dê a ele 515 segundos (`TimeoutStopSec=515` no systemd, `kill_timeout: 515000` e `treekill: false` no pm2), cobrindo os 470 segundos de esvaziamento da fila e a limpeza do banco; no systemd, defina também `KillMode=mixed`, avisando só o processo principal para parar de aceitar tarefas e deixando o `pg_dump` e o `tar` de um backup em andamento terminarem naturalmente. O resultado de uma chamada morta antes da hora fica incerto, e só é repetido depois de ser liberado automaticamente, pelo menos meia hora depois.

Em desenvolvimento, use o modo com atualização a quente: `npm run dev:api`, `npm run dev:worker`, `npm run dev:web`. Para entrar na administração sem login em desenvolvimento, defina `DEV_AUTH_ROLE=admin` no `.env` (em produção, a inicialização é recusada).
