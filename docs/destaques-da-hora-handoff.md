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
