# Adapte para o seu setor

Este repositório vem, por padrão, como um site de exemplo do “setor de IA”: as fontes de exemplo são um conjunto de fontes públicas de notícias de IA, e o critério de seleção é o que o AIHOT afinou por muito tempo na área de IA. Para transformá-lo em “destaques jurídicos”, “destaques de RH” ou “destaques do ouro”, quase tudo o que muda está em duas pastas: [`site/`](../site/) (nome, textos, marca e páginas deste site) e [`industry/`](../industry/) (categorias, fontes, prompts e limiares do setor); o código quase não precisa ser tocado.

Se você usa um Agente como Claude Code ou Codex, pode enviar o trecho abaixo diretamente a ele e responder às perguntas que ele fizer:

```text
Leia o AGENTS.md e o docs/customize.md e transforme este site em um site de destaques do setor «XX».
O que me interessa é: … (escreva as fontes que quer acompanhar, o que considera importante e o que não é, quanto mais concreto melhor).
Depois, rode npm run typecheck, npm test e node scripts/smoke.ts, e me diga o que ainda preciso decidir por conta própria.
```

A seguir está o que ele (ou você) precisa fazer, em ordem.

## 1. Nome e textos do site: `site/site.ts`

Cada item exportado e cada campo de [`site/site.ts`](../site/site.ts) tem um comentário direto ao lado (onde é usado, se pode ficar vazio, o que significa o valor padrão); basta alterar de cima para baixo seguindo os comentários, e depois reconstruir (`docker compose up -d --build`) para valer no front-end e no back-end. Só estes pontos cruzam arquivos ou exigem atenção depois que o site está no ar:

- **O endereço do site não está em `site.ts`**: na implantação, defina pela variável de ambiente `SITE_URL` (`SITE.defaultUrl` é só o valor local de reserva quando `SITE_URL` não está definida).
- **Nomes que mudam juntos**: ao mudar `SITE.name`, mude também `SITE.organization.name` (dados estruturados para mecanismos de busca); em `SITE.crawlerName`, escreva o seu próprio identificador de coleta e não use o nome do site de outra pessoa.
- **Identificadores que não se mudam depois que o site está no ar ou alguém se integrou**: `SITE.mcpPrefix` (prefixo do nome das ferramentas MCP), `PUBLIC_CATEGORIES` (fusão e renomeação de categorias nas interfaces públicas e nos feeds), `ABOUT.termsAnchor` (âncora que outros já fixaram); `SITE.interfaceVersion` só sobe, nunca desce, e ao mudar campos públicos existentes ou o significado deles, suba a versão principal.
- **Horários de edição em hora cheia ou meia hora**: `EDITION_TIMES` (`HH:mm` no horário do site) é verificado por um agendamento que roda a cada meia hora; a janela do resumo diário, o alerta de edição ausente e os textos de horário em vários lugares leem esse valor.
- **Alcance do ocultamento da navegação**: `NAV.hidden` hoje só aceita `"/hot"` e `"/topics"` (trata juntos a barra lateral, a barra inferior, a página “Minha área”, os links de voltar, as trilhas de navegação e, ao ocultar `"/hot"`, a faixa de destaques da página inicial e a posição na página do evento; abrir o endereço diretamente ainda funciona).
- **A explicação do limite de requisições deve bater com a realidade**: só preencha `ACCESS.ratePerMinute` se o proxy reverso à frente realmente limita por IP.

## 2. Categorias, tags e tópicos: `industry/taxonomy.ts`, `industry/topics.json`

[`industry/taxonomy.ts`](../industry/taxonomy.ts) define as categorias (`CATEGORIES`), a contagem de destaques do cabeçalho (`RELEASE`), os termos comuns dispensados de conferência na visão geral (`PLAIN_TERMS`), os tipos de conteúdo (`ITEM_TYPES`), o vocabulário de tags e sinônimos (`CATEGORY_TAGS`, `TOPIC_TAGS`, `ENTITY_TAGS`, `TAG_SYNONYMS`), além do cadastro de empresas e do dicionário contra troca de identidade (`ENTITIES`, `IDENTITY_LEXICON`, `PUBLISHER_DOMAINS`, `IDENTITY_CONTEXT_ALIASES`). O significado de cada campo está nos comentários do arquivo; ao alterar, atenção a estas ligações:

- **O `key` que vai para o endereço não se muda depois de no ar**: o `key` de `CATEGORIES` entra nos endereços e nos endereços de assinatura (`/all?category=`, `/feed/category/<key>.xml`). Para fazer uma categoria ser publicada junto de outra nas interfaces públicas, no RSS e no MCP (mas continuar separada no site), configure em `PUBLIC_CATEGORIES` de `site/site.ts`.
- **Sincronize com os prompts**: se alterou `CATEGORIES`, o vocabulário de tags ou `ITEM_TYPES`, altere também `industry/prompts/structure.md` (princípios de classificação e regras de tags), `content-understanding.md` (enumeração dos tipos de conteúdo) e `selection-score.md` (tabela de pesos das cinco dimensões por tipo de conteúdo).
- **Pode ser esvaziado se não precisar evitar troca de identidade**: `IDENTITY_LEXICON`, `PUBLISHER_DOMAINS` e `IDENTITY_CONTEXT_ALIASES` garantem que as empresas citadas no título e no resumo aparecem no texto original; se o seu setor não precisa dessa verificação, deixe como lista vazia `[]`.
- **`industry/topics.json`** (catálogo de tópicos `/topics`): lido quando o site inicia; depois de alterar, reconstrua (`docker compose up -d --build`) para valer. Tem três grupos: `company` (empresas e instituições), `field` (áreas) e `genre` (formatos de conteúdo); o `slug` não deve mudar depois de no ar:
  - Os tópicos `company` usam `entityId` (o id em `ENTITIES`) para reunir as reportagens que têm essa empresa como sujeito; se uma reportagem tem várias empresas como sujeito, só conta quando o título cita o nome dela. O `aliases` opcional faz uma busca só por essa palavra na caixa de busca também encontrar as reportagens da empresa.
  - Os tópicos `field` e `genre` usam `tags` para reunir as reportagens marcadas com essas tags.

## 3. Fontes: `industry/sources.json`

São as fontes de exemplo importadas na primeira inicialização; as que já existem não são sobrescritas; depois, a cada inicialização, só entra o que está no arquivo e ainda não está no banco, e o que for removido do arquivo não é removido do banco (pause na administração as que não quiser). Com o site no ar, o mais usado é a página “Fontes” da administração: cria, testa a coleta, ajusta a frequência, pausa e mostra o motivo das falhas.

Campos principais de cada fonte:

| Campo | Significado |
|---|---|
| `kind` | `rss`, `web_list` (lista em página, com seletores), `json_list` (interface JSON), `x_search` (conta do X, exige SocialData), `mp_account` (conta do WeChat, exige Dajiala), `external` (envio externo) |
| `config` | A configuração de cada tipo de fonte, veja [Fontes](sources.md) |
| `tier` | Nível da fonte: `T1` oficial de primeira mão, `T1_5` contas oficiais e quase oficiais, `T2` mídia e pessoas, `EXCLUDE_MP` não participa da seleção. Cada nível tem um limiar de entrada diferente. `T1` já significa “primeira mão”, não precisa marcar à parte |
| `owner_entity_id` | Opcional: a que empresa a fonte pertence (id em `ENTITIES`). Várias fontes da mesma empresa contam como uma só parte na popularidade; uma conta oficial `T1_5` que deva ser a reportagem representante também precisa dele (veja [Fontes](sources.md)) |
| `participation_mode` | `editorial` entra na seleção e em todas as atualizações; `hot_signal` serve só de evidência de popularidade; `isolated` não aparece em nenhuma página pública |
| `site_fulltext` | Se o site pode exibir o texto completo. **Desligado por padrão**: só exibe o resumo e o link do original. Só ligue quando a fonte permitir expressamente |
| `syndicate_fulltext` | Se o RSS de texto completo pode levar o corpo. **Desligado por padrão**; só vale quando o site também exibe o texto completo, e só ligue quando a fonte permitir expressamente a republicação |

Em vários setores da China continental, a informação de primeira mão está nas contas do WeChat. As fontes do WeChat precisam de uma chave da Dajiala, são cobradas por requisição e têm disjuntor de orçamento. (No Destaques da Hora, que cobre o Brasil, isso raramente se aplica.)

## 4. Critério de seleção: `industry/prompts/`

Este é o passo em que mais vale gastar tempo: a sua experiência de julgamento sobre o setor é escrita aqui.

| Arquivo | Função |
|---|---|
| `prefilter.md` | Pré-filtro: este material é assunto do setor? Recall amplo, só barra o claramente irrelevante |
| `selection-score.md` | **Critério de pontuação**: dá de 0 a 100. Contém os tipos de conteúdo, as cinco dimensões, os pesos de cada tipo, o valor que precisa ser avaliado normalmente e o ruído que precisa ser contido |
| `content-understanding.md` | Como redigir o conteúdo selecionado e o quase selecionado: título em português, resumo com a resposta primeiro, motivo da recomendação (também gera tags, mas a categoria e as tags exibidas nas páginas vêm do `structure.md`) |
| `rules-domain.md` | Regras de tradução e de manutenção de termos do setor (o exemplo são termos de IA: LLM traduzido como modelo de linguagem grande, Token mantido em inglês…) |
| `mend-wording.md` | Troca de palavras: quando o título, o resumo ou o motivo da recomendação usam palavras listadas em `industry/wording.ts`, pede ao modelo que altere só essas palavras |
| `summarize-*.md` | Como redigir título e resumo de outros conteúdos |
| `structure.md` | Categoria, tags, empresas-sujeito; decide se é uma notícia concreta ou uma matéria de síntese sobre vários fatos; extrai os fatos da notícia (quem, fez o quê, a quê, com a fonte do original e as condições prévias). A categoria e as tags das páginas, as páginas de tópicos, o agrupamento de eventos e o resumo diário dependem dele |
| `group-*.md` | Agrupamento de eventos: duas reportagens são a mesma ocorrência, um desdobramento do mesmo evento, ou dois assuntos; julga também se a reportagem traz informação nova em relação ao que já está na seleção, e as que não trazem não entram |
| `story-digest.md` | A síntese da página do evento (antes de mudar, compare lado a lado com a [avaliação da síntese](story-digest-evaluation.md)) |
| `report-period.md`, `report-period-sections.md` | A visão geral e a apresentação das seções dos resumos semanal e mensal (o resumo diário é montado por regras, não por prompt) |
| `translate-*.md` | Tradução do texto completo |

Se o seu site tem palavras que o texto para o leitor não deve usar (exageros, regionalismos, jargão que o leitor não entende), escreva em `industry/wording.ts`: cada item é uma expressão regular e um jeito de corrigir. Depois de redigir título, resumo e motivo da recomendação, cada um é conferido; se usou, pede-se ao modelo uma única vez que altere só essas palavras (etapa de modelo “troca de palavras”, e a variável `WORDING_MODEL` permite escolher um modelo só para ela); se, depois da troca, os números mudaram, o título ou o resumo ficou vazio, ou o serviço de modelo recusou reescrever, o texto original é mantido. Com a lista vazia, nada é conferido nem se faz chamada extra, e essa etapa também não aparece no alerta de quando o serviço de modelo recusa atender.

Nos prompts, use `{{siteName}}` para o nome do site e `{{> nome do arquivo}}` para incluir outro prompt. Mudar prompts não exige mudar código.

**Maneira recomendada**: preserve primeiro a estrutura (ponderação das cinco dimensões, regras de contenção do ruído, limites de segurança) e troque só os exemplos de “o que é importante” e “o que é ruído” pelos do seu setor. Num setor jurídico, por exemplo, “nova lei publicada oficialmente, decisão importante, sanção de órgão regulador” devem ser avaliados normalmente, e “texto publicitário de escritório, anúncio de curso” devem ser contidos.

## 5. Limiares e calibração: `industry/selection.ts`

A soma de duas pontuações precisa ser ≥ 2 × o limiar para qualificar (o que qualifica ainda passa pela deduplicação do agrupamento, veja [Seleção e calibração](selection.md)). Os limiares padrão (T1 60, T1_5 65, T2 76) foram calibrados pelo AIHOT na área de IA. `classes` são as classes de fonte com limiar elevado (no exemplo, “ecossistema e infraestrutura” e “rankings de avaliação” do setor de IA; ao mudar de setor, troque pelas suas classes ou esvazie), e `browseFloor` é a pontuação mínima para navegar em “todas as atualizações” (padrão 40). Depois de mudar de setor e de prompts, é preciso recalibrar:

1. Escolha de 100 a 200 materiais das suas fontes, marque você mesmo “deve selecionar / não deve” e guarde em `.data/gold.jsonl` (formato em [Seleção e calibração](selection.md); `industry/gold.example.jsonl` traz dois exemplos).
2. Rode `node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl` e veja acurácia, precisão, recall e os resultados em diferentes limiares.
3. No SelectBench da administração, veja um a um os materiais julgados errado, volte a ajustar o prompt de pontuação ou os limiares e rode de novo.

Este passo decide se o seu site “seleciona com acerto”.

## 6. Marca: `site/brand/`

- `logo.svg`, `icon.png` (512), `icon-192.png`, `apple-icon.png` (180), `favicon.ico`: ícones do site.
- `Logo.tsx`: o logotipo com o nome no canto superior esquerdo das páginas; por padrão é composto com o texto do nome do site; se você tem um logo próprio, troque o `Wordmark` pelo seu SVG, mantendo os parâmetros.
- `wordmark.svg`, `wordmark-dark.svg` (opcionais): o logotipo em texto das imagens de compartilhamento e dos pôsteres; a versão escura é usada nas imagens de fundo escuro; sem eles, usa-se o texto do nome do site.
- Fontes das imagens de compartilhamento (opcional, em `assets/og-fonts/`): a imagem de compartilhamento usa um subconjunto do Noto Sans SC (GB2312 + latim básico), e chinês tradicional, kanji japonês, kana, hangul e letras latinas com diacríticos não são desenhados. Se as fontes têm esses textos, coloque `<nome>-400.ttf` e `<nome>-700.ttf`, e os caracteres que faltam são buscados nessas fontes em sequência (pela ordem do nome do arquivo); ao trocar fontes, reinicie o serviço, e o cache das imagens de compartilhamento é renovado junto. Se não colocar, fica como antes.
- `nameplates/`: o título do cabeçalho do topo das páginas de resumo diário, semanal e mensal (por exemplo, “Resumo diário de IA”). Depois de trocar as palavras do setor, gere de novo:
  ```bash
  npm pack @fontsource/noto-sans-sc@5.3.0 && tar xzf fontsource-noto-sans-sc-5.3.0.tgz
  node scripts/nameplates.ts package
  ```
- QR codes da página “Sobre”: primeiro escreva em `ABOUT.maker` de `site.ts` o bloco do autor e os cartões `wechat` e `feishu` (título e descrição); depois, na administração em “Configurações → QR code da página Sobre”, envie a imagem, ou coloque a imagem em `site/brand/contact/` com nome começando por `qr-wechat` ou `qr-feishu`, em png, jpg ou webp. Se faltar o bloco do autor, o cartão ou a imagem, aquele QR code não é exibido.

Não use o nome nem o logo do AIHOT.

Na página “Minha área”, o leitor pode trocar a fonte de “Fonte padrão” para “Fonte padrão do navegador”. A segunda usa a fonte padrão configurada no navegador do leitor e cobre o texto comum, os formulários e os textos dos gráficos dinâmicos; o código continua em fonte monoespaçada, e o logo, o título do cabeçalho e as imagens de compartilhamento continuam com a marca do site. A escolha da fonte só é guardada no navegador atual, e não converte entre chinês simplificado e tradicional. O backup versão 1 da página de favoritos ganhou o campo opcional `font`, e os backups antigos ainda podem ser importados; a importação não sobrescreve a fonte do navegador que o leitor já escolheu.

## 7. Textos das páginas: `site/pages/`, `site/public/`, `site/changelog.json`

- `pages/terms.md`, `pages/privacy.md`: regras de uso e aviso de privacidade. **Hoje são modelos**; antes de ir ao ar, reescreva conforme a sua situação real e, se necessário, peça a um profissional que revise.
- `public/`: os quatro arquivos fixos na raiz do site, publicados depois de trocar os marcadores: `robots.txt`, `manifest.webmanifest` (nome e ícone ao instalar na tela inicial do celular), `openapi-v1.json` (descrição da API pública) e, opcional, `.well-known/security.txt` (contato para problemas de segurança). Só esses quatro arquivos são publicados; outros arquivos colocados ali não aparecem no site, e arquivo que não existe responde 404. Os arquivos podem usar estes marcadores: `{{siteName}}`, `{{siteUrl}}`, `{{description}}`, `{{tagline}}`, `{{locale}}`, os horários de edição `{{dailyTime}}`, `{{weeklyTime}}`, `{{monthlyTime}}`, a versão da interface pública `{{version}}` e as categorias públicas separadas por vírgula `{{categoryList}}`; nos arquivos JSON, o `"{{categories}}"` em listas `enum` ou `examples` é trocado pela lista de keys das categorias públicas.
- `changelog.json`: histórico de atualizações. Vem com um exemplo “Site no ar”; antes de ir ao ar, mude `date`, `time` e `latestVersion` para o seu horário de lançamento; a assinatura do framework no texto de exemplo (“este site foi montado com o framework aberto AIHOT”) também pode ficar ou sair. Entradas novas vão no início, e `latestVersion` passa a ser a data e a hora dela. `kind` é um destes: “Atualização”, “Melhoria”, “Aviso”, “Desativação”; o que o leitor precisa necessariamente ver leva `"urgent": true` (vermelho, marcado “Importante”).

## 8. Modelos e implantação

- Modelos: `LLM_BASE_URL`, `LLM_API_KEY` e `LLM_MODEL` no `.env`; qualquer interface compatível com OpenAI serve, e todas as etapas a usam por padrão. `site/models.ts` lista os modelos nomeados (cada um com o próprio endereço e a variável da chave) e qual é o padrão de cada etapa; na implantação, ainda dá para escolher etapa por etapa pelas variáveis de ambiente (veja `.env.example`) ou pela página “Modelos e avaliação” da administração. Ao usar um modelo de raciocínio (que pensa antes de responder), reserve cota para o raciocínio: defina `LLM_REASONING_TOKENS` no modelo padrão, ou `reasoningTokens` em `site/models.ts` nos modelos nomeados; sem isso, o raciocínio consome toda a cota de saída de cada etapa, a resposta vem vazia e toda chamada falha. A predefinição de pontuação também pode ter `scoreCall: { temperature, maxTokens, timeoutMs }`, que controlam temperatura, cota de saída e tempo limite em milissegundos; a predefinição de pontuação de exemplo já configura esses valores. O `fallbackFor` de um modelo reserva indica, pelo nome da capacidade, qual modelo principal ele substitui, e essa combinação precisa ser avaliada antes com os seus materiais; o site de exemplo não tem combinação reserva por padrão.
- Implantação: veja [Implantação](deploy.md).

## Depois de alterar, verifique

```bash
npm run typecheck
DATABASE_URL=postgres://…/destaques_test npm test     # o nome do banco precisa terminar em _test ou _ci, e a conta precisa poder criar bancos
npm run build -w @aihot/web && npm run test:web
node scripts/smoke.ts --base http://localhost:3000   # depois que o site estiver no ar
```

Reescrever prompts e recalibrar limiares não faz os testes falharem: os testes reconhecem a requisição pelo prompt realmente renderizado em cada etapa, e os limiares são lidos de `industry/selection.ts`. Alguns testes em `tests/` usam categorias, tags e empresas do setor de exemplo (por exemplo `ai-models`, “lançamento de modelo”, Anthropic). Depois de alterar `industry/taxonomy.ts`, esses testes falham; basta trocar os exemplos pelos equivalentes do seu setor, sem mudar a regra que o teste verifica.

Depois, abra o site e dê uma olhada na página inicial, em todas as atualizações, no resumo diário, nas páginas de tópicos e na página “Sobre”, e vá à página “Fontes” da administração para ver se todas as fontes foram coletadas com sucesso.
