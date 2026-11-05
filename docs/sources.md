# Fontes

As fontes são gerenciadas na página “Fontes” da administração: criar, coletar uma vez de teste para ver o que vem, ajustar a frequência, ligar e desligar, ver o motivo das falhas e os itens mais recentes. Na primeira inicialização, as fontes de exemplo de `industry/sources.json` são importadas.

## Seis tipos de fonte

| Tipo | Serve para | Precisa de |
|---|---|---|
| `rss` | Blogs, mídia, Substack e serviços que convertem contas do WeChat em RSS, quando há RSS / Atom | Nada |
| `web_list` | Listas em páginas sem RSS (página de notícias, lista de blog, histórico de atualizações) | Escrever seletores; configurar a renderização do Jina Reader quando necessário (cobrada por uso) |
| `json_list` | Interfaces que devolvem JSON (GitHub Releases etc.) | Escrever os caminhos dos campos |
| `x_search` | Contas do X (Twitter) | Chave do SocialData, cobrada por requisição |
| `mp_account` | Contas do WeChat | Chave da Dajiala, cobrada por requisição |
| `external` | Conteúdo enviado pelos seus próprios scripts | `INGEST_TOKEN`, veja abaixo |

O endereço ou a configuração de um `json_list` pode carregar credenciais, e só segue redirecionamentos para a mesma origem (mesmo protocolo, host e porta). Se a interface mudar para outra origem, atualize diretamente o endereço da fonte; não dependa de um salto entre origens para transmitir autenticação.

Por padrão, a coleta não conecta a endereços da rede interna. Quando o endereço do feed ou da lista aponta para um serviço próprio na rede interna (por exemplo, um RSSHub na mesma rede Docker, com endereço `http://rsshub:1200/...`), defina no `.env` `PRIVATE_FEED_HOSTS=rsshub` (nomes de host completos separados por vírgula, sem diferenciar maiúsculas de minúsculas) e reinicie a API e o worker. A liberação só vale para o próprio `feedUrl` de `rss` e o próprio `url` de `web_list` e `json_list`, e esses hosts são acessados diretamente, sem passar pelo `EGRESS_PROXY_URL`; redirecionamentos para outros hosts, textos de artigos, páginas de detalhe, imagens e ícones continuam recusando endereços internos pelas regras de sempre, e endereços link-local e de metadados de nuvem (`169.254.0.0/16`, `100.100.100.200` etc.) são recusados sempre.

As opções de configuração que cada tipo de fonte reconhece estão em [`config-keys.ts`](../packages/backend/src/sources/config-keys.ts). Se você preencher uma opção desconhecida, o salvamento é recusado, e a coleta falha direto, mostrando o motivo na administração, sem voltar discretamente a um processamento genérico.

## Primeiro visualize, depois crie

Entre em `/admin/sources/new`, preencha o ID e o nome, escolha o tipo e coloque o JSON correspondente da [próxima seção](#como-configurar-cada-tipo-de-fonte) em “Configuração de coleta (JSON)”. O que se preenche aqui é o objeto de configuração, sem envolvê-lo em `kind` ou `config`. Trocar o tipo reinicia a configuração; escolha primeiro o tipo e depois cole.

Observações entre parênteses de largura total no nome (por exemplo, “Alguma mídia (RSS de destaques)”) servem só para a administração; o leitor, no site, no RSS, no Markdown para Agentes, no MCP e na busca, vê o nome sem a observação; contas do X escritas como `X：nome de exibição (@handle)` aparecem ao leitor só com o nome de exibição. No JSON da API pública, o nome continua completo.

`rss`, `web_list`, `json_list` e `x_search` permitem clicar em “Visualizar coleta”: mostra o total de itens e, dos 20 primeiros, título, link do original, horário de publicação e resumo, sem gravar os itens na biblioteca de artigos. Confira se o que veio são artigos e não a navegação, e se a data bate com a do original, e então clique em “Criar”. A visualização e a coleta oficial aplicam o mesmo conjunto de filtros (prefixo de endereço, categoria, palavras de ruído, reescrita de endereço, `publishedAfter`), e o que você vê é o que a coleta oficial vai aceitar; mas isso não equivale a concluir a coleta de produção e não passa pelo complemento de detalhes, pela seleção e pelo fluxo de publicação pública que vêm depois.

A visualização ainda envia requisições de coleta; as visualizações do X e do Jina também podem gerar custo, passando pelo recibo pago e pelo orçamento. `COLLECT_ENABLED=false` só desliga a coleta automática em segundo plano e não serve para garantir que a visualização manual não acesse serviços externos. Os exemplos locais de HTML/JSON abaixo não precisam de nenhuma chave de API.

## Como configurar cada tipo de fonte

### rss

```json
{ "feedUrl": "https://example.com/feed.xml" }
```

Opcional: `summaryIsBody` (quando se confirma que o resumo do feed de texto é o texto completo, usa o `description` do RSS ou o `summary` do Atom como corpo, sem coletar a página original), `allowCategories` / `denyCategories` (filtram pelas categorias do feed).

As páginas de reprodução de vídeo do YouTube e do Vimeo, de qualquer fonte, não são extraídas como corpo de artigo. A descrição de vídeo do Media RSS é mantida como resumo e, mesmo com `summaryIsBody`, a descrição não é tratada como legenda do vídeo; o texto real que o feed fornece por `content` / `content:encoded` continua utilizável. Vídeos incorporados em outros artigos não afetam a leitura do corpo do próprio artigo.

Os vídeos nativos no corpo do artigo mantêm o endereço de mídia seguro e os formatos candidatos, e usam os controles do navegador para reprodução manual. O arquivo de vídeo é buscado direto do site de origem pelo navegador, e a capa continua passando pelo proxy de imagens; não há reprodução automática nem repetição, a dica de pré-carregamento é `none`, mas o navegador não garante que não haja nenhuma requisição antes da interação. Um player sem endereço de mídia nem capa utilizável mantém só o texto de reserva. O Markdown e o RSS de texto completo com redistribuição permitida mantêm a estrutura do vídeo, e a reprodução depende do leitor; players de plataformas dinâmicas e iframes ficam fora deste escopo.

Os gráficos SVG embutidos nas ilustrações do artigo não mantêm o gráfico em si (cores e fontes dependem das folhas de estilo do site de origem); são trocados pela descrição de acessibilidade que o site de origem escreveu para o gráfico (o texto apontado por `aria-label` e `aria-labelledby`, ou o `<title>` e `<desc>` do gráfico), colocada como texto puro no lugar original do gráfico; as duas versões, larga e estreita, do mesmo gráfico ficam em uma só cópia, e o texto que a ilustração já mostra (legenda, subtítulo) não se repete. Gráficos sem descrição e ícones SVG fora das ilustrações continuam sendo removidos.

Em episódios de podcast sem página (sem `<link>`, e com `guid` que não é um endereço), o link do original usa o arquivo de áudio ou de vídeo, que o navegador consegue reproduzir diretamente; esses episódios não coletam página e são tratados pelo texto do feed.

### web_list

Aceita seletores CSS comuns, e listas em `div` também podem ser coletadas. O essencial é que o `itemSelector` selecione **cada notícia**, e não o contêiner que envolve todas. Por exemplo:

```html
<div class="news-list">
  <div class="news-item">
    <h2><a href="/posts/first">Primeira notícia de exemplo</a></h2>
    <time datetime="2026-10-01T09:00:00+08:00">1º de outubro</time>
  </div>
  <div class="news-item">
    <h2><a href="/posts/second">Segunda notícia de exemplo</a></h2>
    <time datetime="2026-10-01T10:00:00+08:00">1º de outubro</time>
  </div>
</div>
```

A configuração correspondente (`example.com` é um endereço de exemplo; troque pela página de destino; a versão executável está nos [exemplos locais](#rodando-os-exemplos-htmljson-localmente)):

```json
{
  "url": "https://example.com/news",
  "parseMode": "html",
  "itemSelector": ".news-list > .news-item",
  "linkSelector": "h2 a",
  "titleSelector": "h2 a",
  "publishedAtSelector": "time",
  "allowUrlPrefixes": ["https://example.com/posts/"]
}
```

- O `itemSelector` procura os itens na página inteira; `linkSelector` e `titleSelector` pegam o primeiro nó correspondente dentro de cada item, e também podem corresponder ao próprio item. Escolher `.news-list` dá apenas um contêiner, e em geral só se obtém a primeira notícia; escrever só `div` mistura contêineres aninhados. Selecione o nó de notícia que se repete.
- O link vem de `href`; links relativos como `/posts/first` são resolvidos pelo endereço final da lista depois de redirecionamentos, e também é possível indicar o endereço-base com `baseUrl`. O título é o texto do nó. Links repetidos são fundidos; quando, numa lista Markdown, aparece primeiro um botão como “Read more” e depois o título real, usa-se o título real. Links que apontam para a própria lista em geral são ignorados.
- A data é procurada dentro do item com `publishedAtSelector`, tentando em ordem os atributos `datetime`, `content`, `title` e o texto; um texto de dica que não pode ser interpretado não esconde uma data válida do mesmo nó. Datas e horas sem fuso podem usar `publishedAtUtcOffset` (padrão `+08:00`); horários com fuso mantêm a semântica do fuso original, e um simples `YYYY-MM-DD` é lido como meia-noite UTC. Meses incompletos, números de versão de produto e datas de calendário inexistentes não valem como data de publicação.
- `parseMode`: em páginas comuns o padrão é `html`; `markdown` lê links Markdown; `docusaurus_changelog` lê títulos de histórico de atualizações; `intercom_changelog` lê título e corpo pelas seções de data da central de ajuda do Intercom, cada seção mantendo a própria âncora de endereço, lendo por padrão pelo dia do calendário UTC, e também é possível indicar `publishedAtUtcOffset`. Quando precisar do Jina, escreva explicitamente o `url` como `https://r.jina.ai/https://site-de-destino/caminho` e configure `JINA_API_KEY`; não há troca automática quando a coleta não funciona. O Jina devolve Markdown por padrão; para continuar usando seletores CSS, defina explicitamente `parseMode: "html"`.
- `detail`: quando a lista não tem data, título ou resumo, coleta a página de detalhe para completar (`publishedAtSelector`, `titleSelector`, `summarySelector` etc.). `maxFetches` é quantas páginas de detalhe se lê por rodada no máximo; sem definir, vale 0, ou seja, nenhuma página é lida: cada página lida é uma requisição a mais, por isso a própria fonte precisa declarar. Os itens cuja leitura falhou ou que passaram do `maxFetches` da rodada continuam sendo completados nas coletas seguintes; ao completar metadados, o texto já confirmado é mantido. Um título real já existente não volta a ser o texto de botão só porque a lista continua escrevendo “Read the Blog”, nem a página de detalhe é lida de novo só porque o título é longo. Para forçar o uso do título do detalhe, defina `titleAuthoritative: true`. Quando a página de detalhe e a extração do texto leem um horário sem fuso, usam primeiro `detail.publishedAtUtcOffset`, herdam o `publishedAtUtcOffset` da fonte se não definido, e se nenhum dos dois estiver definido o padrão é `+08:00`. RSS e listas JSON também podem usar `detail`.
- No `detail.titleRegex` e `publishedAtRegex` de listas do Jina, as expressões regulares casam com o texto do Jina e podem compartilhar a mesma resposta de detalhe; os seletores CSS leem o HTML do site de origem. Escolha as regras conforme a página realmente legível.
- `allowUrlPrefixes` / `denyUrlPrefixes`: só aceita artigos de certos caminhos.

### json_list

Suponha que a interface devolva a estrutura abaixo: `itemsPath` aponta para o array, e os demais caminhos de campo são escritos relativos a **cada elemento do array**. Os caminhos usam ponto como separador, não é JSONPath, e não se escreve `$` nem `[*]`.

```json
{
  "data": {
    "items": [
      {
        "id": "first",
        "title": "Primeira notícia de exemplo",
        "url": "https://example.com/posts/first",
        "summary": "Resumo da primeira notícia.",
        "published_at": "2026-10-01T09:00:00+08:00"
      }
    ]
  }
}
```

A configuração correspondente:

```json
{
  "url": "https://example.com/api/news",
  "mode": "json_api",
  "itemsPath": "data.items",
  "titlePaths": ["title"],
  "urlTemplate": "{raw:url}",
  "summaryPaths": ["summary"],
  "publishedAtPath": "published_at",
  "externalIdPath": "id"
}
```

- Quando a própria interface devolve um array, omita `itemsPath`. `titlePaths`, `summaryPaths` e `authorPaths` são arrays de caminhos candidatos, e vale o primeiro valor não vazio, na ordem, por exemplo `["title", "name"]`.
- Quando já existe o endereço completo, use `{raw:url}`; quando só há o slug, é possível usar `https://example.com/posts/{slug}`. `{caminho do campo}` codifica o valor do campo, e `{raw:caminho do campo}` insere como está. A lista JSON não completa sozinha um endereço relativo em absoluto; o modelo deve produzir um endereço HTTP(S) completo.
- `summaryIsBody`: quando se confirma que o resumo da interface é o texto completo, defina `true`, e o texto obtido por `summaryPaths` é tratado como corpo, sem coletar a página original.
- Recomenda-se que a data venha como string ISO com fuso; horários sem fuso como `2026-09-30 17:43:58` são lidos, como nas listas de páginas, pelo `publishedAtUtcOffset` (padrão `+08:00`); para carimbos de tempo numéricos, defina `publishedAtUnit: "epoch_s"` (segundos) ou `"epoch_ms"` (milissegundos), e para datas como `20261001`, defina `"yyyymmdd"`.
- Itens sem título ou sem como gerar o link são ignorados. Quando todos os itens de um array não vazio falham no mapeamento, aparece `no items mapped (check title/url paths)`; quando o caminho não é um array, aparece `items path did not resolve to an array`.

### Rodando os exemplos HTML/JSON localmente

O repositório traz dois exemplos fictícios: [news.html](examples/sources/news.html) e [news.json](examples/sources/news.json), cada um com duas notícias. Servem para conferir seletores e mapeamento de campos, não são fontes de operação; os links dos artigos de exemplo não fornecem texto.

Na raiz do repositório, com Node.js 24.11 ou superior, rode o comando abaixo. O serviço escuta só na própria máquina e serve apenas esses dois arquivos; pare com `Ctrl+C`.

```bash
node --input-type=module -e '
import http from "node:http";
import { readFileSync } from "node:fs";
const files = {
  "/news.html": ["text/html; charset=utf-8", readFileSync("docs/examples/sources/news.html")],
  "/news.json": ["application/json", readFileSync("docs/examples/sources/news.json")]
};
http.createServer((req, res) => {
  const file = files[req.url];
  res.writeHead(file ? 200 : 404, { "content-type": file ? file[0] : "text/plain" });
  res.end(file ? file[1] : "Not found");
}).listen(8787, "127.0.0.1");'
```

Na mesma máquina, prepare o banco conforme o [método sem Docker](deploy.md#sem-docker), rode a API e o site de desenvolvimento com `npm run dev:api` e `npm run dev:web`, mantenha desligadas as chaves de coleta, modelos, Feishu e IndexNow, e não inicie o worker. Só para este exemplo local, defina `ALLOW_PRIVATE_NETWORK_FETCH=true` no processo da API de desenvolvimento e reinicie; por padrão é proibido coletar endereços internos, a produção recusa ligar esta opção, e depois da verificação ela deve ser removida. Se a API estiver num contêiner ou em outro servidor, `127.0.0.1` aponta para ele mesmo, e o endereço deste comando não pode ser usado diretamente nessa implantação.

Escolha `web_list` e `json_list` em separado, cole a configuração e clique em “Visualizar coleta”, sem precisar criar a fonte:

```json
{
  "url": "http://127.0.0.1:8787/news.html",
  "parseMode": "html",
  "itemSelector": ".news-list > .news-item",
  "linkSelector": "h2 a",
  "titleSelector": "h2 a",
  "publishedAtSelector": "time",
  "allowUrlPrefixes": ["http://127.0.0.1:8787/posts/"]
}
```

```json
{
  "url": "http://127.0.0.1:8787/news.json",
  "mode": "json_api",
  "itemsPath": "data.items",
  "titlePaths": ["title"],
  "urlTemplate": "http://127.0.0.1:8787/posts/{id}",
  "summaryPaths": ["summary"],
  "publishedAtPath": "published_at",
  "externalIdPath": "id"
}
```

Nas duas vezes devem aparecer **2 itens**, na ordem da tabela abaixo. O exemplo JSON também mostra os resumos correspondentes, e o exemplo HTML não tem extração de resumo configurada. A data da API de visualização é UTC, e a interface da administração mostra, em `+08:00`, 09:00 e 10:00.

| Título | Link do original | `publishedAt` na API de visualização |
|---|---|---|
| Primeira notícia de exemplo | `http://127.0.0.1:8787/posts/first` | `2026-10-01T01:00:00.000Z` |
| Segunda notícia de exemplo | `http://127.0.0.1:8787/posts/second` | `2026-10-01T02:00:00.000Z` |

Dá para trocar temporariamente o `itemSelector` do HTML por `.news-list` para comparar: só devolve o primeiro. Voltando a `.news-list > .news-item`, voltam os dois, e essa é a diferença entre “contêiner da lista” e “cada notícia”.

Ao coletar uma página real, veja primeiro se a resposta HTTP bruta contém os nós de notícia. O modo HTML comum não executa JavaScript; o que se vê no navegador mas não está na resposta não pode ser gerado trocando o seletor CSS. Procure primeiro um RSS ou uma interface JSON, ou configure o Jina quando necessário, ou uma coleta externa mantida por você. `no items matched (html)` também pode ser seletor que não casa, falta de `href` ou de título, ou link filtrado pela regra de prefixo; confira primeiro a resposta e a configuração, sem precisar trocar o coletor.

### x_search

Este tipo de fonte usa a busca do SocialData; não se coloca a URL do perfil do X numa lista de página. Tomando `https://x.com/SomeAccount` como exemplo, use o nome de usuário `SomeAccount`, sem `@` nem a URL inteira:

```json
{ "query": "from:SomeAccount -filter:replies", "searchType": "Latest" }
```

`SomeAccount` é um nome de usuário de exemplo; troque pela conta real que quer acompanhar. `-filter:replies` exclui respostas; `Latest` busca o conteúdo mais recente.

Configure `SOCIALDATA_API_KEY` no `.env` do ambiente do back-end e reinicie a API (visualização) e o worker (coleta agendada) para valer; não escreva a chave no JSON da fonte nem a envie ao repositório. Primeiro confira na administração, em “Configurações → Limites de requisições pagas”, a cota do SocialData, e só então visualize quando precisar. Sem a chave configurada, aparece `SOCIALDATA_API_KEY is not configured`; quando o serviço recusa a requisição ou o disjuntor de orçamento atua, veja o motivo do erro na administração. A visualização pode ter requisições pagas, este texto não exige verificar com o serviço real, e o resultado depende da conta e do que o serviço devolve na hora.

Na coleta automática de produção, as contas comuns são fundidas automaticamente numa única busca (no máximo umas vinte e poucas contas por vez), economizando requisições; a visualização manual de uma fonte individual não é uma coleta fundida.

### mp_account

```json
{ "ghid": "gh_xxxxxxxx", "nickname": "Nome da conta" }
```

Cada conta do WeChat é verificada uma vez no seu intervalo de coleta (consultar a lista é cobrado por uso), e o texto dos artigos novos é trazido junto.

É preciso configurar `DAJIALA_KEY` no `.env` do back-end, e trocar `ghid` pelo ID original da conta. Os campos de configuração são `ghid` / `nickname` acima, e não devem ser escritos como `biz` / `name`. Hoje o `mp_account` não aceita “Visualizar coleta”; o `external` também não aceita coleta de teste ativa, e se integra pela interface de envio abaixo.

## Classificação, forma de participação e texto completo

- **Classificação** `tier`: `T1` oficial de primeira mão (site oficial, blog oficial, instituições), `T1_5` contas oficiais e criadores quase oficiais, `T2` mídia e pessoas, `EXCLUDE_MP` não participa da seleção. O limiar de entrada na seleção varia conforme a classificação (`industry/selection.ts`).
- **Classe da fonte** (opcional): uma fonte oficial cujo conteúdo do dia a dia é escrito principalmente para desenvolvedores ou para o setor pode receber, na página “Fontes” da administração, uma classe (`classes` em `industry/selection.ts`), elevando o limiar de entrada a pelo menos o número da classe, veja [Seleção e calibração](selection.md#limiares-industryselectionts). O `industry/sources.json` não traz este item, e depois de importar ele é definido na administração.
- **Forma de participação** `participation_mode`: `editorial` entra na seleção e em todas as atualizações; `hot_signal` não é exibida sozinha, serve só de evidência de popularidade para “do que as pessoas estão falando”; `isolated` não entra em nenhuma página pública.
- **Primeira mão**: só `T1` conta como primeira mão, sem definição à parte. Quando uma mesma notícia tem várias reportagens, a reportagem representante prefere a de primeira mão, e a página do evento também exibe primeiro a reportagem de primeira mão.
- **Editor** (opcional, escrito em `config`):
  - `publisherUrlPrefixes`: o prefixo dos endereços dos próprios artigos de uma fonte `T1`, por exemplo `["https://example.com/blog/"]`. Os artigos com esses endereços trazidos por outras fontes (agregadores, republicações), desde que se possa identificar uma única fonte oficial, passam a ser registrados em nome dela. Numa fonte de lista de página que não escreve isso, vale o caminho onde fica a própria lista (e o artigo também precisa ter aparecido na lista dela).
  - `publisherRole`: a identidade da conta `T1_5`, `organization` (conta oficial da instituição) ou `person` (pessoa oficial). Preencha também o `owner_entity_id` da fonte (o id em `ENTITIES` de `industry/taxonomy.ts`), e as notícias postadas por essa conta cujo sujeito é essa empresa podem ser a reportagem representante (ficando depois de `T1`).
- **Texto completo**: `site_fulltext` decide se o site pode exibir o texto completo, e `syndicate_fulltext` decide se o RSS de texto completo pode levar o corpo. Os dois vêm **desligados por padrão**, mostrando só o resumo e o link do original; só ligue quando a fonte permitir expressamente. Contas do WeChat e conteúdo atrás de paywall não ganham exibição de texto completo só porque tecnicamente dá para coletar.
- **Foto de capa**: `site_images` decide se a foto da fonte aparece como capa do item, com crédito. Vem **desligado por padrão**; só ligue para fontes que liberam as fotos com crédito. A foto passa pelo proxy de imagens assinado, nunca é copiada para o servidor.

## Frequência de coleta

Cada fonte tem o próprio intervalo de coleta. Todo dia às 04:20 ele é ajustado automaticamente pela produção dos últimos 7 dias: quem produz mais é coletada com mais frequência, no mínimo 15 minutos (listas de páginas lidas pelo Jina, no mínimo 60 minutos); no máximo, 60 minutos para fontes comuns, 120 minutos para contas do X e listas de páginas lidas pelo Jina, e 180 minutos para as que servem só de evidência de popularidade. As contas do X de busca fundida seguem o ritmo da busca fundida: as que entram na seleção, uma vez a cada meia hora, e as que servem só de evidência de popularidade, uma vez por hora.

Uma coleta que falha não avança a posição, e a próxima continua do mesmo ponto; as fontes com falhas seguidas ficam marcadas em vermelho na administração, e toda segunda-feira é enviado ao grupo de operação um resumo semanal das fontes (quando o alerta do Feishu está configurado).

“7 dias sem conteúdo novo” é julgado pelo **ritmo da própria fonte**, e não por uma janela fixa: no resumo diário e no semanal há duas classes. As **que passaram do próprio ritmo de atualização** vêm primeiro, para conferir com o site de origem (pega-se os **dias de produção** dos últimos 90 dias, reduzidos a “dias”, e a mediana do intervalo entre dias vizinhos é o ritmo; só se considera que tem ritmo quem tem pelo menos 4 desses dias, e o tempo de silêncio precisa passar de 4 vezes o intervalo mediano para contar como excesso). O dia de produção é o horário de publicação do conteúdo, e, se a página não dá o horário, o dia em que o descobrimos; **uma primeira importação conta como um dia**: é uma entrega única, e por mais que o horário de publicação se espalhe para trás não conta como várias produções (senão uma fonte que nunca produziu pareceria muito pontual, e uma primeira importação que atravessa meses esticaria o intervalo mediano e esconderia uma fonte que já ficou quieta). A janela só conta os dias de produção desses 90 dias, e o histórico mais antigo não diz com que frequência ela publica agora; o horário de descoberta e o de publicação não têm ordem fixa, vale qualquer um que caia dentro da janela, e o dia de produção é de novo limitado pela janela. **As que não têm como julgar o ritmo continuam listadas**, mas não são tratadas como falha, em dois casos: não há produção comparável dentro da janela (ela produziu, mas tudo fora da janela), e nunca recebeu conteúdo (isso é problema de coleta); as que estão dentro do próprio ritmo deixam de ser listadas. O intervalo de coleta `interval_minutes` não participa do julgamento: ele indica com que frequência olhamos, e não com que frequência ela publica.

## Regra: conteúdo antigo não inunda a tela

O material que, quando descoberto pela primeira vez, já tinha sido publicado há mais de 48 horas, os itens de acervo da primeira importação de uma fonte nova e os envios marcados como retroativos são todos arquivados pela data original: não entram em “hoje” nem são enviados. O material sem horário de publicação confiável não é publicado de imediato (não entra nas listas públicas, na seleção, nos relatórios, nos destaques nem nos envios), e só se julga se é novo ou antigo depois de ler a data na fonte original ou na página do texto. Esta regra é compartilhada por todas as entradas, para impedir que uma importação de conteúdo histórico de uma só vez inunde a tela.

Na primeira importação de uma fonte nova, só se pegam os primeiros `_aihot.initialBackfillLimit` itens da lista (padrão 30), dos últimos `_aihot.initialBackfillMonths` meses (padrão 12). As coletas seguintes só aceitam itens com horário de publicação até 48 horas antes da primeira importação da fonte, ou depois; o acervo mais antigo da lista não entra mais, sem pagar pelo arquivo inteiro do feed; os itens publicados depois da primeira importação são aceitos, em qualquer posição de uma lista longa. Os itens sem horário de publicação na lista são aceitos normalmente e, pela regra acima, esperam a leitura da data para ser julgados. Contas do X são lidas adiante a partir da posição de coleta, sem essa restrição.

Se quiser monitorar apenas a partir de um horário fixo, defina `publishedAfter` na configuração de RSS, lista de página ou JSON, por exemplo `"2026-10-01T00:00:00.000Z"`. Precisa ser um horário UTC completo, podendo omitir os milissegundos; a visualização, a primeira coleta e as seguintes só aceitam itens **estritamente posteriores** a ele e com data de publicação confiável, e as datas desconhecidas também são excluídas. Se uma página de atualização única no dia do ponto de partida continuar usando a mesma data de publicação, o conteúdo acrescentado depois também não será incluído; considere esse limite ao escolher o ponto de partida.

## Interface de envio externo

O conteúdo que você coleta com scripts próprios pode ser enviado ao site, passando pela mesma deduplicação, seleção e agrupamento da coleta comum.

```
POST /api/ingest/items
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "sourceId": "my-crawler",
  "sourceName": "Meu script de coleta",
  "items": [
    { "title": "obrigatório", "url": "obrigatório", "publishedAt": "2026-10-01T08:00:00+08:00", "author": "opcional" }
  ]
}
```

- `INGEST_TOKEN` é definido no `.env`, com pelo menos 16 caracteres; sem defini-lo, a interface responde sempre 401.
- No máximo 50 itens por vez; acima disso devolve 413. Quantas vezes por minuto cada cliente pode enviar é decidido por `INGEST_RATE_LIMIT`: no `docker compose` o padrão é 10, e acima disso devolve 429 (com `Retry-After: 60`); sem Docker o padrão é sem limite, e se não houver limite de proxy reverso à frente, defina no `.env`; 0 significa sem limite.
- Devolve `{"ok": true, "created": <número de itens criados>}`. Itens que não são objetos JSON e itens sem título ou endereço são ignorados, e endereços repetidos na mesma requisição ficam só com o primeiro.
- Quando o `sourceId` não existe, é criada automaticamente uma fonte `external`, que por padrão não entra nas páginas públicas: só aparece no site depois que, na administração, a forma de participação dela for mudada para `editorial`.
- Depois de pausar a fonte na administração, a interface de envio devolve 409 e deixa de receber artigos novos; ao retomar a fonte, o envio pode continuar.
- Quando o `raw._aihot.backfill` do item é `true`, é tratado como carga histórica (não entra em “hoje” e não é enviado).
