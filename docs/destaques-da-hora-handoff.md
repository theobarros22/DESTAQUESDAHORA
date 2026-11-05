# Destaques da Hora — passagem de bastão para outro agente

Fork PT-BR do AIHOT (MIT). Portal de notícias: Política (Nacional + RJ) + IA + Tecnologia + Dicas. Dono: Theo Barros (decide por último). Idioma de trabalho: português do Brasil, direto e executivo.

## Estado (atualizado em 2026-11-04)

Branch de trabalho: `destaques-da-hora` (repo `theobarros22/DESTAQUESDAHORA`). Ainda não foi mesclado na `main`; perguntar ao Theo se abre PR.

### Feito
- Fuso de Brasília (`SITE_UTC_OFFSET = "-03:00"`, `America/Sao_Paulo`); nomes `beijing*` mantidos para facilitar merge com o upstream.
- `industry/`: taxonomia (politica, eleicoes, ia-politica, ia, tecnologia, dicas, analise), 36 temas, 16 fontes RSS (várias com `"$comment": "A VERIFICAR"`), os 31 prompts em PT-BR, regras de redação, neutralidade política.
- `site/site.ts` em PT; logo do Theo em `site/brand/destaques/` (azul #0A2A52 + laranja #F26419).
- Detecção de idioma (`isChineseText` agora detecta português; a chave interna `zh` significa "idioma do site").
- Interface pública (`apps/web`) e painel admin traduzidos.
- Saídas do backend: `publication/agent.ts` traduzido.
- Domínio de teste registrado: `destaquesdahora.dpdns.org` (DigitalPlat, gratuito, modo "configurar depois", sem nameservers ainda).

### Falta
1. Traduzir o resto do backend (achar com `python3 scripts/dev/zh.py dump <arquivos>`): `publication/llms.ts, feeds.ts, detail.ts, reports.ts, og.ts`, `operations/alerts.ts, feedback.ts, reports.ts`, `notify/*`, `admin/*`, `editorial/models.ts`, `apps/api/src/routes/{mcp,og,agent,feedback}.ts`, `packages/contracts/src/{site,taxonomy}.ts` (`REPORT_NAMES` → Boletim / Resumo semanal / Balanço mensal), fontes da imagem OG (Noto Sans SC → fonte latina).
2. `site/pages/terms.md` e `privacy.md` em PT com LGPD (cabeçalho da tabela "Item"; chaves Versão/Vigência/Responsável/Contato; marcador "Apresentação:"). O Theo precisa aprovar o texto.
3. `site/public/*` (robots, manifest, openapi-v1.json: trocar +08:00 por -03:00), README e docs em PT com crédito ao AIHOT (manter LICENSE/NOTICE), nomes no docker-compose, remover o police-badge, rótulo de login Feishu.
4. Imagens novas em PT (docs/assets: banner, how, cluster, perf, shots — claro e escuro), ícones (favicon, icon 512/192, apple-icon 180, logo.svg) e nameplates (`scripts/nameplates.ts`, fonte latina) no lugar das antigas.
5. Implementar no código a capa estilo jornal. Mockup aprovado em desenho (aguarda OK do Theo): https://claude.ai/artifact/LXXBVg14Qh9vW33ng4EjEh. Fontes: Newsreader + Archivo.
6. Verificar os feeds marcados "A VERIFICAR" (rede do ambiente bloqueia sites BR; testar numa máquina com internet).
7. Domínio: apontar nameservers para o Cloudflare e criar o registro DNS para o IP do servidor quando houver VPS (Caddy faz o HTTPS). Para o lançamento, usar um .com.br.

## Ferramentas
- `scripts/dev/zh.py`: `dump <arquivos>` lista linhas não comentadas com caracteres Han (`caminho:linha:conteúdo`); `apply <json>` troca linhas (`{arquivo:{numeroLinha: novaLinha}}`). Depois de aplicar, rode o typecheck: aspas escapadas em atributos JSX e pontuação CJK solta quebram a compilação.
- Node 24 é necessário (`npm i node@24` num diretório temporário se a máquina tiver menos).

## Verificação
```bash
npm run typecheck
DATABASE_URL=postgres://127.0.0.1:5432/destaques_test npm test
npm run build -w @aihot/web && npm run test:web
```
Sem banco, os testes avulsos dão 119 ok / 38 falhas, igual ao repo original (ambiental), então não houve regressão. Os testes com banco ainda não foram rodados.

## Regras que valem (do AGENTS.md)
Segurança desligada em dev: `COLLECT_ENABLED`, `MODEL_CALLS_ENABLED`, `FEISHU_*_ENABLED`, `INDEXNOW_SUBMIT_ENABLED`. Nunca commitar `.env` ou chaves. Não usar nome/logo AIHOT. Texto integral só onde a fonte permite (hoje, só Agência Brasil, CC BY). Perguntar ao Theo: nome do site, fontes, o que é ruído, termos e privacidade.

## Pendências do Theo
Aprovar o layout da capa; decidir sobre o PR para a `main`; conta DigitalPlat/Cloudflare é dele (senhas e verificações só ele faz).

## Atualização — 04/11/2026 (escopo ampliado e estado)

- **Editorias novas** (pedido do Theo): `brasil` (país), `mundo`, `esportes`, `cinema` (Cinema e Séries). Ficam em `industry/taxonomy.ts`; tipo de conteúdo novo `general_news` (pesos 2/2/2/3/1) em `industry/prompts/selection-score.md` e `content-understanding.md`. Etiquetas novas: Cotidiano/Brasil, Mundo/Geopolítica, Esportes, Cinema/Séries.
- **Pré-filtro e ruído** foram reescritos para não bloquear esporte/cinema/mundo; esporte e cinema de rotina têm teto `sig ≤ 3`.
- **Fontes**: 11 feeds novos em `industry/sources.json` (Agência Brasil por editoria, ONU News, BBC Brasil, DW, CNN Brasil). Todos "A VERIFICAR": o sandbox não alcança esses sites; teste em /admin/sources.
- **Risco aberto**: mais volume dilui a linha política/IA e aumenta o custo de modelo. Os limiares de `industry/selection.ts` precisam ser recalibrados com amostras rotuladas (`scripts/eval-selection.ts`); não mexer por intuição.
- **Domínio**: destaquesdahora.dpdns.org registrado; falta Cloudflare (nameservers) e um VPS para o registro DNS.
- **Backend e interface**: traduzidos. Testes standalone: 120 passam / 38 falham (ambiental, igual ao repositório original).
- **Pendente**: README em PT, tradução de docs/*.md, capa estilo jornal no código (mockup no artifact 9e208c1c…), PR para main, verificar feeds, termos/privacidade (rascunho; o Theo precisa preencher CNPJ/responsável/contato).

## Atualização — 05/11/2026 (Rio de Janeiro e ambiente de teste)

- **Destaque: Rio de Janeiro** (o portal é do Rio): grupo `regiao` + tema `rio-de-janeiro` (primeiro em `industry/topics.json`), etiqueta "Rio de Janeiro" em `taxonomy.ts` e regra de tema em `content-understanding.md` (vale para qualquer editoria quando o fato ocorre ou afeta o estado, a capital ou a região metropolitana, incluindo Maricá). `TopicGroupKey` em `packages/contracts/src/site.ts` inclui `regiao`.
- **Fontes do Rio** (5, todas "A VERIFICAR"): Alerj, Governo do RJ, Prefeitura do Rio, TRE-RJ e Agência Brasil RJ. Total: 32 fontes.
- **Hospedagem de teste (Google Cloud, projeto `destaques-da-hora`)**:
  - VM `destaques-da-hora`, e2-micro (Always Free), us-central1-f, Debian 13, disco padrão de 30 GB, HTTP/HTTPS liberados, 964 MB de RAM.
  - IP externo fixo reservado: `34.27.26.143` (nome `ip-destaques-da-hora`). O IP externo pode ser cobrado; o crédito de teste da conta expirou.
  - Alerta de orçamento R$ 30/mês (≈ US$ 5), avisos em 50%, 90% e 100%, escopo da conta de faturamento inteira. É só aviso, não trava gastos.
  - Instalados na VM: swap de 2 GB, Docker 29.9.3 e git 2.47.3. Acesso: `gcloud compute ssh` pelo Cloud Shell (chave gerada lá, sem senha).
  - Enviado, **sem confirmação de resultado**: clone do repositório em `~/app`, `.env` com segredos aleatórios (coleta e chamadas de modelo **desligadas**, `SITE_URL=http://34.27.26.143`, `PORT=80`) e `docker compose up -d --build` em segundo plano (log em `~/build.log`).
  - Risco: 1 GB de RAM é pouco para Postgres + web + api + worker e para o build do web. Se falhar, compilar em outro lugar ou usar só uma página "Em breve". Serve para teste, não para o lançamento.
- **DNS ainda não feito**: `destaquesdahora.dpdns.org` não tem registro A. Passo seguinte (com OK do Theo): no DigitalPlat criar A (e `www`) para `34.27.26.143`; depois `SITE_URL=https://destaquesdahora.dpdns.org`, `SITE_DOMAIN=destaquesdahora.dpdns.org`, `PORT=127.0.0.1:3000`, `TRUST_PROXY=true` e `docker compose --profile https up -d --build` (Caddy emite o HTTPS).
- **Alternativa sem custo**: PC + Cloudflare Tunnel (adicionar o domínio ao Cloudflare e trocar os nameservers no DigitalPlat; o token do túnel não vai para chat nem repositório).
- **Segredos**: o `ADMIN_PASSWORD` e os demais ficam só em `~/app/.env` na VM. Nada disso entra no repositório.
- **Pendente**: conferir o estado do build na VM, DNS, capa estilo jornal, README em PT, tradução de `docs/*.md`, verificar feeds, calibrar a seleção, termos/privacidade, e domínio `.com.br` para o lançamento.

## Tradução do repositório (05/11/2026)

- Traduzidos para o português: README, documentação (`docs/`), `.github/`, comentários do código (apps, packages, scripts, testes), `industry/selection.ts`, `site/models.ts`, `site/README.md`, `industry/README.md`, `assets/`, exemplos `.jsonl` e mensagens dos scripts.
- Mantido em chinês de propósito: analisadores de data, RSS, limpeza de texto e regex que tratam texto chinês (`sources/dates.ts`, `rss.ts`, `web-list.ts`, `content/sanitize.ts`, `lib/text.ts`, `editorial/writing.ts`), dados de teste que exercitam esse comportamento, direitos autorais do projeto original (`LICENSE`, `NOTICE`) e migrações já publicadas (imutáveis).
- Verificação: `npm run typecheck` passa; testes standalone com a mesma linha de base (120 passam / 38 falham).

## Atualização — 05/11/2026 (fotos licenciadas, redação própria e novo cabeçalho)

**Regra permanente do Theo**: tudo que for feito é salvo no repositório (commit + push em `destaques-da-hora`) com instruções para o próximo agente continuar. Ao terminar qualquer etapa, atualize esta seção e o doc do Project `claude/destaques-da-hora-status.md`.

### Decisões do Theo
- **Redação própria**: o portal reescreve os fatos com palavras próprias (síntese de várias fontes), sem copiar texto, estrutura ou ângulo. Implementado em `industry/prompts/rules-original-wording.md`, incluído por `summarize-article`, `summarize-long-post`, `understand` e `story-digest`.
- **Fotos primeiro, mas só com licença**: o Theo pediu fotos da internet "com crédito, ou reprodução da internet". Isso foi recusado (Lei 9.610, art. 108: risco de indenização) e ele aceitou. Caminho: foto de fonte licenciada (Câmara, Senado, Agência Brasil após confirmar licença, arquivo próprio, Wikimedia com licença, bancos livres, agência paga, ilustração de IA rotulada); sem foto licenciada, capa tipográfica.
- **Casca (opção A)**: faixa de navegação azul-marinho (#0A2A52, destaque laranja #F26419) no topo do computador, no lugar da barra lateral, em todas as páginas; o celular mantém a barra inferior.
- Linguagem de design: modelo "Politica." (mockup no artifact 9e208c1c-0f02-4036-a061-2422b5d107da, `project/Main.dc.html`).

### Feito e commitado
- `site_images` por fonte (migração `0124_sources_site_images.sql`, padrão desligado; admin, contratos, seed, `industry/sources.json`). Só a Agência Câmara está ligada. A foto sai de `coverView()` em `packages/backend/src/publication/items.ts` via proxy assinado, com crédito `Foto: Arquivo/<fonte>`. Teste em `tests/image-url.standalone.test.ts`. Docs em `docs/customize.md` e `docs/sources.md`.
- Testes avulsos: 121 passam / 38 falham (os 38 são ambientais, linha de base).

### Feito, ainda NÃO verificado (código novo da casca)
- `apps/web/app/components/shell/Masthead.tsx` (faixa com data, `ThemeSwitch`, nome do site e navegação; `DesktopFooter` com GitHub e registros), `apps/web/app/lib/changelog-dot.ts` (hook movido), tokens `--masthead`/`--masthead-hi` em `app.css`, `root.tsx` em coluna, `Sidebar.tsx` removido (junto com o trilho `rail()` e a variante `short`), `nav.ts` com `mastheadNav()` e `navIsActive()`. `--page-max-wide` agora desconta 56px, não 236px.
- **Falta rodar**: `npm run typecheck`, `npm run build -w @aihot/web && npm run test:web` (`apps/web/tests/page-width.test.ts` cita o trilho/barra lateral nos comentários e mede larguras 669/711/941: confira e atualize), e conferir no navegador em duas larguras (desktop e ~800px): faixa rolando de lado com poucas e muitas entradas, botão de voltar, entrada "Minha área" (`/more`), barra inferior do celular, configuração padrão e não padrão de `site/site.ts` NAV (exigência do AGENTS.md para mudanças de navegação).

### Próximos passos (nesta ordem)
1. Verificar a casca (acima) e corrigir o que quebrar.
2. **Faixa "Agora" (ticker)**: ficou de fora do cabeçalho porque o loader do `root.tsx` só busca `/api/site/meta`; precisa de um endpoint ou campo com as últimas manchetes, lido pela camada `packages/backend/src/publication/`.
3. **Capa nova** (`apps/web/app/routes/` home): "As últimas", manchete grande, "Escolhas da redação", "Rio agora" (tema `rio-de-janeiro`), "Em alta" numerado, grades por editoria; usar `item.cover` com o crédito visível, e capa tipográfica quando `cover` for nulo.
4. Fontes: testar os feeds da lista do Theo (revistaoeste, gazetadopovo, g1/globonews, pleno.news, tecnologia, economia) e adicionar os que passarem como "A VERIFICAR"; confirmar a licença das fotos da Agência Brasil na Carta de Serviços da EBC; adicionar feeds do Senado, TSE, Alerj e TRE-RJ com `site_images` só se a licença permitir. Pendente a resposta do Theo sobre uma editoria "Economia" e sobre fontes de equilíbrio.
5. Atualizar a nota do mockup em `project/canvas.json` (hoje diz "capas tipográficas, sem foto de terceiros") e a altura do Celular depois da checagem visual.
6. Hospedagem: confirmar `http://34.27.26.143` de fora; DNS de `destaquesdahora.dpdns.org` + Caddy HTTPS (ver seção anterior); renomear `aihot-*` no `docker-compose`; fechar a aba 1728210419 (Cloud Shell) do Chrome. Coleta e chamadas de modelo seguem desligadas até o Theo decidir o custo.
7. Termos e privacidade precisam de CNPJ, responsável e contato, e de revisão jurídica.

### Referência de mercado: agendadopoder.com.br/rio (analisado em 05/11/2026 a partir de espelho do site enviado pelo Theo)
- **Produção**: WordPress.com (Jetpack) com tema próprio e plugin de newsletter. Matéria assinada por jornalista (assinatura + hora de publicação + hora de "atualizado"). Texto de abertura direto, fatos sintetizados em frases próprias. Não dá para afirmar se há IA ou RSS por trás; o site não publica expediente nem metodologia.
- **Fotos**: um crédito sob a imagem em todas as matérias, na forma `Foto: <fotógrafo>/<órgão>` (ex.: foto de assessoria de clube), `Foto: Divulgação`, `Foto: Divulgação/<órgão>` e `Reprodução`. Ou seja, o canal real de foto é a **assessoria de imprensa** (clubes, órgãos públicos, empresas). Cada assessoria tem seus termos; confira antes de ligar `site_images`. Não copiar o uso de "Reprodução" (é o risco jurídico já discutido).
- **Layout**: editorias (Política, Rio, Polícia, Opinião, Economia, Mundo, Saúde, Rio Já, Reportagens Especiais, blog assinado), "Últimas notícias", "Mais lidas", "Relacionadas", tags, busca. Esporte carioca (Flamengo, Vasco) fica dentro de "Rio".
- **Faixa do topo não é ticker**: o endpoint `faixa-topo` do plugin é uma faixa de **anúncio** (origem Google Ad Manager, recarrega a cada 30 s). A faixa "Agora" do nosso mockup continua sendo ideia nossa (últimas manchetes), não cópia deles.
- **Receita**: Google Ad Manager e AdSense, anúncios nativos, vídeo patrocinado na home e nas matérias, push (OneSignal), newsletter e o botão "Seguir no Google" (fonte preferida no Discover).
- **Ideias aproveitáveis**: hora de "atualizado" visível; bloco "Mais lidas" (já temos `/hot`); "Rio Já" como fluxo rápido (equivale ao tema `rio-de-janeiro`); newsletter (o boletim diário já existe); esporte do Rio como editoria de audiência.
