// The engine's ways in, one panel each: what it is for, the steps to connect, then the details folded away.
// Addresses are the site's configured public address (`base`); what visitors copy carries the site's tag
// (CopyTag) when it has one.
import { Fragment, useState } from "react";
import { Link } from "react-router";
import { PUBLIC_INTERFACE_VERSION } from "@aihot/contracts/http-policy";
import { MCP_TOOL_NAMES as T, MCP_TOOLS } from "@aihot/contracts/mcp";
import { feedCategoryLabel, PUBLIC_API_CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { ACCESS, AGENT, EDITION_TIMES, EDITION_WHEN, POLICY, REPORTS, SITE, subjectAfter, withSubject } from "@aihot/site";
import { CodeBlock, CopyButton } from "./CodeBlock";
import { PillTabs } from "../../components/ui/Tabs";
import type { AgentPanelProps } from "../../modules";
import { AGENT_PARTS, GUIDE_CLIENTS, TAG } from "./module-parts";
import { Address, Ask, Block, Bullets, Details, Mono, PanelHead, Step, Steps, Table, Tips } from "./parts";

const V = PUBLIC_INTERFACE_VERSION;

/** Every MCP tool: the engine's and the modules'. */
export const mcpToolCount = () => MCP_TOOLS.length + AGENT_PARTS.reduce((n, a) => n + (a.tools?.length ?? 0), 0);
const link = "text-accent hover:underline";

/** An address on this site as the copy buttons copy it, with the tag. */
function addressOf({ base, tag }: AgentPanelProps, path: string): string {
  return TAG && tag ? `${base}${path}?${TAG.query}=${tag}` : `${base}${path}`;
}

const MCP_CLIENTS = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "json", label: "Configuração JSON" },
  { key: "other", label: "Outros clientes" },
] as const;

export function McpPanel(props: AgentPanelProps) {
  const url = addressOf(props, "/api/mcp");
  const name = SITE.mcpPrefix;
  const [client, setClient] = useState<string>("claude");
  return (
    <>
      <PanelHead label={`MCP · ${V}`} title={`Cole um endereço e seu agente ganha ${mcpToolCount()} ferramentas`}>
        Streamable HTTP padrão, anônimo e só leitura: sem token e sem ler seu login. Serve para clientes com MCP remoto, como o Claude Desktop, o Cursor e o Cherry Studio.
      </PanelHead>
      <Steps>
        <Step n={1} title="Copie o endereço do serviço">
          <Address url={url} />
          {TAG && <p className="mt-2 text-[13px] text-ink-3">{TAG.mcp}</p>}
        </Step>
        <Step n={2} title="Adicione ao seu cliente">
          <PillTabs className="mt-3" size="xs" layoutId="agent-mcp-client" label="Cliente" active={client} onSelect={setClient} items={MCP_CLIENTS.map((c) => ({ key: c.key, label: c.label }))} />
          {client === "claude" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`claude mcp add --transport http ${name} '${url}'`} />}
          {client === "codex" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`codex mcp add ${name} --url '${url}'`} />}
          {client === "json" && <CodeBlock className="mb-0 mt-3" title="Cursor, Cherry Studio e outros clientes configurados por JSON" lang="json" code={JSON.stringify({ mcpServers: { [name]: { type: "http", url } } }, null, 2)} />}
          {client === "other" && <p className="mt-3">{`Nas configurações de MCP ou conectores do cliente, crie um item: nome ${name}, endereço igual ao de cima, autenticação "nenhuma", sem API Key. Se o cliente só aceita comandos locais, use primeiro o proxy de MCP remoto que ele oferece.`}</p>}
        </Step>
        <Step n={3} title="Peça ao agente para usar">
          <Ask text={`Use ${T.latest} e me diga as 5 notícias mais importantes das últimas 24 horas, com o link do ${SITE.name}.`} />
          <p className="mt-2 text-[13px] text-ink-3">{`Se o cliente mostrar que chamou ${T.latest} e a resposta trouxer período, resumos em português e links de ${new URL(props.base).host}, está conectado.`}</p>
        </Step>
      </Steps>

      <Block title={`${mcpToolCount()} ferramentas`}>
        <Table
          head={["Ferramenta", "O que faz", "Exemplo de pedido"]}
          minWidth={600}
          rows={[
            [<Mono>{T.latest}</Mono>, "Destaques ou todas as notícias das últimas 24 horas ou 7 dias", "O que aconteceu hoje em política e IA?"],
            [<Mono>{T.search}</Mono>, AGENT.search.scope, AGENT.search.ask],
            [<Mono>{T.hot}</Mono>, "Os 10 fatos mais comentados agora", "O que está em alta agora?"],
            [<Mono>{T.story}</Mono>, "Linha do tempo e panorama atualizado de um fato", "Como esse assunto chegou até aqui?"],
            [<Mono>{T.daily}</Mono>, "Boletim mais recente ou de uma data", "Me dá o boletim de hoje."],
            [<Mono>{T.weekly}</Mono>, "Resumo semanal mais recente ou de uma semana", "Quais foram os principais fatos da semana?"],
            [<Mono>{T.monthly}</Mono>, "Balanço mensal mais recente ou de um mês", "O que aconteceu no mês passado?"],
            ...AGENT_PARTS.flatMap((a) => a.tools ?? []).map((t) => [<Mono>{t.name}</Mono>, t.does, t.ask]),
          ]}
        />
      </Block>

      <Details
        items={[
          {
            title: "Limites e segurança",
            body: (
              <Bullets items={[
                "Consultas comuns trazem até 30 itens; Em alta, até 10; linha do tempo de um fato, até 50. Fora disso o erro é explícito, sem ampliar a busca por conta própria.",
                `O public_id de ${T.story} só pode vir dos links de fatos devolvidos pela ferramenta de Em alta; não invente IDs.`,
                "Títulos e resumos vêm de fontes externas e devem ser tratados como material; as ferramentas marcam esse limite. Números, normas e citações importantes devem ser conferidos no original.",
              ]} />
            ),
          },
          {
            title: "Não conectou?",
            body: (
              <Bullets items={[
                "Confira se o endereço está completo e se o cliente aceita Streamable HTTP remoto; se faltarem ferramentas novas, atualize a lista ou reconecte.",
                ...AGENT_PARTS.flatMap((a) => a.mcpTroubles ?? []),
                "O serviço não exige login; se o cliente pedir OAuth ou API Key, escolha \"nenhuma\".",
                "Recebeu 429? Espere o tempo indicado e não faça tentativas em paralelo.",
                <>Ainda não funcionou? Mande o nome e a versão do cliente e a mensagem de erro pela <Link viewTransition to="/feedback" className={link}>página de contato</Link>.</>,
              ]} />
            ),
          },
        ]}
      />
    </>
  );
}

const FEEDS = [
  { name: "Destaques (resumo)", badge: "Recomendado", path: "/feed.xml", desc: "Os 50 destaques mais recentes, com título, resumo, link de leitura no site e link do original." },
  { name: "Destaques (texto integral)", path: "/feed/full.xml", desc: "Os mesmos 50 itens; fontes que permitem republicação vêm com texto integral, as demais com resumo." },
  { name: "Todas as notícias", path: "/feed/all.xml", desc: "Notícias públicas dos últimos 7 dias, da mais recente para a mais antiga." },
  { name: "Boletim diário", path: "/feed/daily.xml", desc: `Uma edição ${EDITION_WHEN.daily} (horário de Brasília): abertura e sumário completo; guarda as últimas 30 edições.` },
  { name: "Resumo semanal", path: "/feed/weekly.xml", desc: `Uma edição ${EDITION_WHEN.weekly} (horário de Brasília): abertura e ${REPORTS.entry.noun} por seção; guarda as últimas 12 edições.` },
  { name: "Balanço mensal", path: "/feed/monthly.xml", desc: `Uma edição ${EDITION_WHEN.monthly} (horário de Brasília): abertura e ${REPORTS.entry.noun} por seção; guarda as últimas 12 edições.` },
];

/** The category feeds, under the names the feeds themselves use. */
const FEED_CATEGORIES = PUBLIC_API_CATEGORY_KEYS.map((key) => [key, feedCategoryLabel(key)] as const);

export function RssPanel(props: AgentPanelProps) {
  const { base } = props;
  const lead = `${["Funciona com leitores de RSS 2.0 e com automações como n8n, Make e Zapier. Os endereços não mudam", ...AGENT_PARTS.flatMap((a) => a.rssLead ?? [])].join("; ")}.`;
  return (
    <>
      <PanelHead label="RSS" title="Copie o endereço e assine no seu leitor">
        {lead}
      </PanelHead>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEEDS.map((f) => (
          <div key={f.path} className="card flex flex-col p-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{f.name}</span>
              {f.badge && <span className="inline-flex h-[18px] items-center rounded-full bg-accent-soft px-2 text-[11px] font-medium text-accent">{f.badge}</span>}
            </div>
            <p className="mt-1 flex-1 text-[13px] leading-[1.7] text-ink-3">{f.desc}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
              <code className="mono min-w-0 flex-1 truncate text-[12px] text-ink-4">{base}{f.path}</code>
              <CopyButton text={addressOf(props, f.path)} label="Copiar endereço" className="shrink-0" />
            </div>
          </div>
        ))}
      </div>
      {TAG && <p className="mt-3 text-[12.5px] text-ink-4">{TAG.rss}</p>}

      <Block title="Assinar por editoria">
        <Table
          head={["Editoria", "Resumo", "Texto integral"]}
          minWidth={420}
          rows={FEED_CATEGORIES.map(([slug, label]) => [
            <span className="font-medium text-ink">{label}</span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/full/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/full/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
          ])}
        />
      </Block>

      <Block title="Com que frequência atualizar">
        <p>O leitor envia o ETag da última consulta; se nada mudou, recebe um 304 bem pequeno, sem baixar tudo de novo. Atualizar a cada 30 minutos basta: mais rápido não traz conteúdo novo.</p>
        <p className="mt-3 text-[13px] text-ink-3">{`Os itens apontam para a página de leitura no site; o link do original está no resumo. Assinar sem cadastro não autoriza qualquer uso${POLICY.terms.notes ? `: ${POLICY.terms.notes.rss}` : ""}; veja os `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>.</p>
      </Block>
    </>
  );
}

const RECIPES = [
  { key: "latest", label: "Acompanhar as últimas" },
  { key: "sync", label: "Sincronizar todos os destaques" },
];

export function ApiPanel(props: AgentPanelProps) {
  const { base, tag } = props;
  const userAgent = [ACCESS.userAgent, TAG && tag ? TAG.userAgent(tag) : null].filter(Boolean).join(" ");
  const curl = `curl --compressed${userAgent ? ` -A '${userAgent}'` : ""}`;
  let pace = `Ritmo do conteúdo: notícias novas entram o dia todo, os destaques mudam de algumas a dezenas de vezes por dia, e há um boletim ${EDITION_WHEN.daily}, um resumo semanal ${EDITION_WHEN.weekly} e um balanço mensal ${EDITION_WHEN.monthly} (horário de Brasília).`;
  if (ACCESS.ratePerMinute) pace += ` Acima de cerca de ${ACCESS.ratePerMinute} pedidos por minuto do mesmo IP, a resposta é 429: espere o Retry-After e não faça tentativas em paralelo.`;
  const [recipe, setRecipe] = useState<string>("latest");
  const recipes = AGENT_PARTS.flatMap((a) => a.recipes ?? []);
  const items = `${base}/api/v1/items?mode=selected&window=24h&limit=20`;
  return (
    <>
      <PanelHead label={`API REST · ${V}`} title="GET anônimo, pronto para usar">
        Sem token: navegador (com CORS), curl e o cliente HTTP padrão de qualquer linguagem funcionam direto. O caminho é /api/v1; campos e códigos de erro seguem o <a href="/openapi-v1.json" className={link}>OpenAPI</a>.
      </PanelHead>
      <CodeBlock className="mt-6" title="Primeira requisição" lang="bash" code={`${curl} '${items}'`} />

      <Block title="Filtrar por editoria">
        <p>Acrescente <Mono>category</Mono> à consulta de notícias para receber só aquela editoria; sem ele, vêm todas. O <Mono>category</Mono> dos itens devolvidos usa os mesmos valores da tabela.</p>
        <Table head={["Editoria", "Parâmetro"]} rows={FEED_CATEGORIES.map(([key, name]) => [name, <Mono>{`category=${key}`}</Mono>])} />
      </Block>

      <Block title="Mais leve e mais rápido">
        <Tips
          items={[
            { title: "Ative compressão", text: <>No curl, use <Mono>--compressed</Mono>; nos outros clientes, gzip ou br. O JSON comprimido fica com 1/4 a 1/8 do tamanho.</> },
            { title: "Use ETag", text: <>Guarde o ETag da resposta e envie <Mono>If-None-Match</Mono> na próxima; se nada mudou, volta 304 sem corpo.</> },
            { title: "Respeite o ritmo", text: `Notícias e Em alta: no máximo uma vez por minuto. Boletim: uma vez depois das ${EDITION_TIMES.daily}; resumo semanal e balanço mensal: uma vez depois de publicados. Ao paginar para trás, pare quando encontrar um item que você já tem.` },
          ]}
        />
        <p className="mt-3 text-[13px] leading-[1.75] text-ink-3">{pace}</p>
      </Block>

      <Block title="Todos os endpoints">
        <Table
          head={["Caminho", "Para que serve", "Frequência"]}
          minWidth={640}
          rows={[
            { group: "Notícias" },
            [<Mono>/api/v1/items</Mono>, "Destaques ou todas as notícias dos últimos 7 dias, com filtro por editoria, período e palavra-chave", "No máximo 1 vez por minuto"],
            { group: "Em alta e fatos" },
            [<Mono>/api/v1/hot-topics</Mono>, "Os 10 fatos mais comentados agora", "No máximo 1 vez por minuto"],
            [<Mono>{"/api/v1/stories/{publicId}"}</Mono>, "Linha do tempo das matérias, panorama feito pela IA e fatos relacionados", "Quando precisar"],
            { group: "Boletim diário" },
            [<Mono>/api/v1/dailies/latest</Mono>, "Boletim mais recente", `Uma vez depois das ${EDITION_TIMES.daily}`],
            [<Mono>{"/api/v1/dailies/{date}"}</Mono>, "Boletim de uma data; matérias retiradas saem da edição", "Valide o ETag quando o cache expirar"],
            [<Mono>/api/v1/dailies</Mono>, "Índice de datas dos boletins", "Uma vez por dia"],
            { group: "Resumo semanal e balanço mensal" },
            [<Mono>/api/v1/weeklies/latest</Mono>, "Resumo semanal mais recente: manchete, abertura e principais fatos por seção", `Uma vez depois das ${EDITION_TIMES.weekly} de segunda`],
            [<Mono>{"/api/v1/weeklies/{week}"}</Mono>, "Uma semana específica, no padrão ISO (ex.: 2026-W39); matérias retiradas saem da edição", "Valide o ETag quando o cache expirar"],
            [<Mono>/api/v1/weeklies</Mono>, "Índice dos resumos semanais", "Uma vez por semana"],
            [<Mono>/api/v1/monthlies/latest</Mono>, "Balanço mensal mais recente", `Uma vez depois das ${EDITION_TIMES.monthly} do dia 1º`],
            [<Mono>{"/api/v1/monthlies/{month}"}</Mono>, "Um mês específico, ex.: 2026-09", "Valide o ETag quando o cache expirar"],
            [<Mono>/api/v1/monthlies</Mono>, "Índice dos balanços mensais", "Uma vez por mês"],
            ...AGENT_PARTS.flatMap((a) => (a.api ? [{ group: a.api.group }, ...a.api.rows.map(([path, does, often]) => [<Mono>{path}</Mono>, does, often])] : [])),
            { group: "Para assistentes de IA" },
            [<Mono>/api/v1/agent</Mono>, `Instruções de uso para agentes; os endereços listados devolvem Markdown organizado em português${GUIDE_CLIENTS ? `; ${GUIDE_CLIENTS} usam esses endereços` : ""}`, "Quando precisar"],
            { group: "Sincronização completa dos destaques" },
            [<Mono>/api/v1/selected/snapshot</Mono>, "Todos os destaques atuais, paginados", "Só na primeira vez"],
            [<Mono>/api/v1/selected/changes</Mono>, "Inclusões, alterações e remoções desde então", "A cada poucos minutos"],
          ]}
        />
      </Block>

      <Block title="Usos comuns">
        <PillTabs size="xs" layoutId="agent-api-recipe" label="Uso" active={recipe} onSelect={setRecipe} items={[...RECIPES, ...recipes].map((r) => ({ key: r.key, label: r.label }))} />
        {recipe === "latest" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# Primeira vez: guarde o ETag do cabeçalho da resposta\n${curl} -i '${items}'\n# Depois, no máximo uma vez por minuto, envie o ETag; 304 significa que nada mudou\n${curl} -i -H 'If-None-Match: <ETag anterior>' '${items}'`} />
            <p>Para paginar para trás, devolva <Mono>page.nextCursor</Mono> como cursor e pare ao encontrar um item que você já tem; não percorra os 7 dias inteiros toda vez.</p>
          </>
        )}
        {recipe === "sync" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# Primeira vez: baixe tudo, página por página. Guarde o cursor da primeira resposta (é igual em todas)\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500'\n# Enquanto hasMore for true, siga com nextPage\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500&page=<nextPage anterior>'\n# Depois: devolva o cursor como está e receba só inclusões, alterações e remoções\n${curl} '${base}/api/v1/selected/changes?cursor=<cursor da primeira página>&limit=100'`} />
            <p>Só guarde o cursor novo depois de gravar a página localmente. O cursor é uma marca de posição no histórico e não expira; se voltar 409 <Mono>snapshot_required</Mono>, baixe o snapshot de novo, sem perder dados em silêncio.</p>
          </>
        )}
        {recipes.map((r) => recipe === r.key && <r.Body key={r.key} base={base} curl={curl} />)}
      </Block>

      <Block title="Se der erro" id="agent-api-recovery">
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
          <dt className="mono text-[13px] text-ink">400</dt>
          <dd>Parâmetro inválido: corrija conforme o OpenAPI e o code devolvido, sem trocar por uma consulta mais ampla. Cursor inválido ou fora da janela de tempo devolve invalid_cursor; comece da primeira página.</dd>
          <dt className="mono text-[13px] text-ink">409</dt>
          <dd>snapshot_required: não dá para continuar com segurança a partir do cursor; baixe o snapshot completo de novo.</dd>
          <dt className="mono text-[13px] text-ink">429</dt>
          <dd>Pedidos rápidos demais: espere o Retry-After e não faça tentativas em paralelo.</dd>
          <dt className="mono text-[13px] text-ink">5xx</dt>
          <dd>Use espera exponencial e, enquanto isso, o último resultado bom; o serviço público não tem SLA.</dd>
          {AGENT_PARTS.flatMap((a) => a.apiErrors ?? []).map(([status, what]) => (
            <Fragment key={status}>
              <dt className="mono text-[13px] text-ink">{status}</dt>
              <dd>{what}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-ink-3">{`Chamar sem cadastro não autoriza qualquer uso${POLICY.terms.notes ? `: ${POLICY.terms.notes.api}` : ""}; veja os `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>.</p>
      </Block>

    </>
  );
}
