import { SITE } from "@aihot/site";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import type { Route } from "./+types/content-item";
import type { AdminContentChain, AdminPresentationRefresh } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money } from "../../features/admin/format";
import { KIND_LABEL, MODE_LABEL, VISIBILITY_LABEL } from "../../features/admin/labels";
import { AdminPage, Badge, Button, Card, Empty, Field, Input, Json, KV, ReasonDialog, Select, Textarea } from "../../features/admin/ui";


export async function loader({ request, params }: Route.LoaderArgs) {
  return adminGet<AdminContentChain>(request, `/api/admin/content/${encodeURIComponent(params.id)}`);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: `${loaderData?.publication?.title ?? loaderData?.article.title ?? "Conteúdo"} · painel do ${SITE.name}` }];

function Step({ title, meta, children, tone = "accent", last }: { title: ReactNode; meta?: ReactNode; children: ReactNode; tone?: "accent" | "muted" | "bad"; last?: boolean }) {
  const dot = tone === "bad" ? "bg-hot" : tone === "muted" ? "bg-ink-4" : "bg-accent";
  return (
    <li className="relative pl-7">
      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-line-strong" aria-hidden />}
      <span className={`absolute left-[3px] top-[7px] size-[9px] rounded-full ring-4 ring-bg ${dot}`} aria-hidden />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
        {meta && <div className="text-[12px] text-ink-4">{meta}</div>}
      </div>
      <div className="mt-2 pb-6 text-[13px] text-ink-2">{children}</div>
    </li>
  );
}

type Dialog = null | "visibility" | "seo" | "override" | "analyze" | "extract" | "presentation" | "group" | "detach" | "merge";

export default function ContentItem({ loaderData }: Route.ComponentProps) {
  const c = loaderData;
  const a = c.article;
  const p = c.publication;
  const { run, pending } = useAdminAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [presentation, setPresentation] = useState<AdminPresentationRefresh | null>(null);
  const [visibility, setVisibility] = useState<string>(p?.visibility ?? "public");
  const [fields, setFields] = useState({ title: "", summary: "", reason: "", category: "", tags: "", scoreMode: "", score: "", selected: "", silent: "" });
  const [mergeInto, setMergeInto] = useState("");
  const version = c.override?.version ?? 0;
  const base = `/api/admin/content/${encodeURIComponent(a.id)}`;
  const story = c.membership[0];
  const title = p?.title ?? a.title;

  const openOverride = () => {
    const f = (c.override?.fields ?? {}) as Record<string, unknown>;
    setFields({
      title: String(f.title ?? ""),
      summary: String(f.summary ?? ""),
      reason: String(f.reason ?? ""),
      category: String(f.category ?? ""),
      tags: Array.isArray(f.tags) ? (f.tags as string[]).join(", ") : "",
      scoreMode: f.score === null ? "none" : typeof f.score === "number" ? "value" : "",
      score: typeof f.score === "number" ? String(f.score) : "",
      selected: f.selected === undefined ? "" : String(f.selected),
      silent: f.silent === undefined ? "" : String(f.silent),
    });
    setDialog("override");
  };

  return (
    <AdminPage
      title={<span className="line-clamp-2">{title}</span>}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[12px]">{a.id}</span>
          <span>·</span>
          <Link className="hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
          <span>·</span>
          <a className="max-w-[420px] truncate hover:text-accent" href={a.url} target="_blank" rel="noreferrer">{a.url}</a>
          {p?.visibility !== "withdrawn" && p && (
            <>
              <span>·</span>
              <a className="text-accent" href={`/items/${a.id}`} target="_blank" rel="noreferrer">Página pública</a>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button onClick={() => setDialog("visibility")}>Visibilidade</Button>
          {p && <Button onClick={() => setDialog("seo")}>{p.indexable ? "Tirar do Google" : "Liberar para o Google"}</Button>}
          <Button onClick={openOverride}>Correção manual</Button>
          <Button onClick={() => { setPresentation(null); setDialog("presentation"); }}>Atualizar exibição do texto</Button>
          <Button onClick={() => setDialog("analyze")}>Reavaliar</Button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        {p ? <Badge tone={p.visibility === "public" ? "ok" : "warn"}>{VISIBILITY_LABEL[p.visibility] ?? p.visibility}</Badge> : <Badge>Não publicado</Badge>}
        {p?.selected && <Badge tone="accent">Destaque</Badge>}
        {p?.eligible === false && <Badge>Fora das páginas públicas</Badge>}
        {a.backfill && <Badge tone="warn">Carga histórica</Badge>}
        <Badge>Processamento {a.processing_state}</Badge>
        {c.override && <Badge tone="info" title={c.override.reason ?? undefined}>Ajuste manual v{c.override.version}</Badge>}
      </div>
      {a.processing_error && <div className="mb-5 rounded-card bg-hot-soft px-4 py-3 text-[13px] text-hot ring-1 ring-hot/20">{a.processing_error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card title="Caminho do processamento">
          <ol className="pt-1">
            <Step title="Fonte" meta={`${KIND_LABEL[a.source_kind] ?? a.source_kind} · ${String(a.tier).replace("_", ".")} · ${MODE_LABEL[a.participation_mode] ?? a.participation_mode}`}>
              <Link className="text-ink hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
              <span className="text-ink-4"> · texto integral no site {a.site_fulltext ? "permitido" : "não permitido"} · texto integral em RSS/API {a.syndicate_fulltext ? "permitido" : "não permitido"}</span>
            </Step>
            <Step title="Coleta" meta={`${c.discoveries.length} vezes`}>
              <ul className="space-y-1">
                {c.discoveries.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num text-ink-4">{bj(d.discovered_at, true)}</span>
                    <span>{d.via}</span>
                    {d.source_id !== a.source_id && <span className="text-ink-3">via {d.source_id}</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 text-[12px] text-ink-4">
                Data do original {a.published_at ? bj(a.published_at, true) : "desconhecida"}{a.published_at_claim && !a.published_at ? ` (alegada ${a.published_at_claim}, não aceita)` : ""} · linha do tempo {bj(a.timeline_at, true)}
              </div>
            </Step>
            <Step title="Texto e revisões" meta={`versão ${a.revision} · texto ${a.body_status} · ${a.body_chars ?? 0} caracteres`}>
              {c.revisions.length ? (
                <ul className="space-y-1">
                  {c.revisions.map((r) => (
                    <li key={r.revision} className="flex gap-2">
                      <span className="num text-ink-4">v{r.revision}</span>
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="num shrink-0 text-ink-4">{bj(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Só a versão inicial</span>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => setDialog("extract")}>Extrair o texto de novo</Button>
              </div>
            </Step>
            <Step title="Avaliação dos modelos" meta={`${c.analyses.length} vezes`} tone={c.analyses.length ? "accent" : "muted"}>
              {c.analyses.length ? (
                <div className="space-y-3">
                  {c.analyses.map((an) => (
                    <div key={an.id} className="rounded-control bg-bg-sunk/60 p-3 ring-1 ring-line">
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <Badge tone={an.relevance === "pass" ? "ok" : "muted"}>{an.relevance}</Badge>
                        {an.selected && <Badge tone="accent">Selecionada</Badge>}
                        <Badge tone="info">Nota {an.score}</Badge>
                        {an.category && <Badge>{CATEGORY_LABELS[an.category as keyof typeof CATEGORY_LABELS] ?? an.category}</Badge>}
                        <span className="text-ink-4">{an.model} · {an.prompt_version} · entrada v{an.input_revision} · {an.origin} · {bj(an.created_at)}</span>
                      </div>
                      {an.title_zh && <div className="mt-2 font-medium text-ink">{an.title_zh}</div>}
                      {an.reason_zh && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{an.reason_zh}</div>}
                      {an.receipts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                          {an.receipts.map((r) => (
                            <span key={r.id} className="num rounded-mark bg-surface px-1.5 py-0.5 text-ink-3 ring-1 ring-line">
                              Recibo #{r.id} · {r.status} · {r.model ?? r.service}{r.cost !== null ? ` · ${money(r.cost)}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-ink-4">{a.participation_mode === "editorial" ? "Ainda sem avaliação (na fila ou com falha)" : "Fontes de repercussão não passam por avaliação editorial"}</span>
              )}
            </Step>
            <Step title="Publicação" tone={p ? (p.visibility === "withdrawn" ? "bad" : "accent") : "muted"} meta={p ? `atualizado em ${bj(p.updated_at, true)}` : undefined}>
              {p ? (
                <KV
                  items={[
                    ["Visibilidade", VISIBILITY_LABEL[p.visibility] ?? p.visibility],
                    ["Destaque", p.selected ? `Sim · visível a partir de ${p.visible_after ? bj(p.visible_after, true) : "agora"}` : "Não"],
                    ["Editoria", p.category ? CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category : null],
                    ["Etiquetas", (p.tags as string[] | null)?.join(", ")],
                    ["Resumo", p.summary],
                    ["Por que importa", p.reason],
                    [
                      "Exibição do texto",
                      `${p.body_mode}${p.syndicate ? " · texto integral em RSS/API" : ""}${
                        p.indexable ? (p.seo_indexed_at ? " · indexável (marcado à mão)" : " · indexável (destaque, automático)") : p.seo_excluded_at ? " · não indexável (excluído à mão)" : " · não indexável"
                      }`,
                    ],
                  ]}
                />
              ) : (
                <span className="text-ink-4">Sem publicação (não passou na relevância ou ainda em processamento)</span>
              )}
              {c.override && (
                <div className="mt-3 rounded-control bg-accent-softer p-3 ring-1 ring-accent/15">
                  <div className="text-[12px] text-ink-3">Ajuste manual v{c.override.version} · {c.override.updated_by} · {bj(c.override.updated_at, true)}{c.override.reason ? ` · ${c.override.reason}` : ""}</div>
                  <Json value={{ visibility: c.override.visibility, ...c.override.fields }} label="Campos ajustados" collapsed={false} />
                </div>
              )}
            </Step>
            <Step title="Histórico de sincronização dos destaques" meta={`${c.ledger.length} registros`} tone={c.ledger.length ? "accent" : "muted"}>
              {c.ledger.length ? (
                <ul className="space-y-1">
                  {c.ledger.map((l) => (
                    <li key={l.seq} className="flex gap-2">
                      <span className="num text-ink-4">#{l.seq}</span>
                      <Badge tone={l.op === "remove" ? "warn" : "ok"}>{l.op}</Badge>
                      <span className="num text-ink-4">visível {bj(l.visible_at)} · gravado {bj(l.changed_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Nunca entrou no fluxo de sincronização dos destaques</span>
              )}
            </Step>
            <Step title="Agrupamento por fato" tone={story ? "accent" : "muted"} meta={a.grouped_at ? `agrupado em ${bj(a.grouped_at, true)}` : "não agrupado"}>
              {c.membership.map((m) => (
                <div key={m.fact_id} className="mb-2">
                  <div>
                    Fato <span className="font-mono text-[12px]">#{m.fact_id}</span> {m.fact_title} <Badge>{m.role}</Badge> {m.manual && <Badge tone="info">Manual</Badge>}
                  </div>
                  {m.story_public_id && (
                    <div className="mt-0.5">
                      História <a className="text-accent" href={`/story/${m.story_public_id}`} target="_blank" rel="noreferrer">{m.story_title}</a> <span className="font-mono text-[12px] text-ink-4">#{m.story_id}</span>
                    </div>
                  )}
                </div>
              ))}
              {c.decisions.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12.5px]">
                  {c.decisions.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span className="num text-ink-4">{bj(d.created_at)}</span>
                      <Badge>{d.verdict}</Badge>
                      {d.fact_id && <span>Fato #{d.fact_id}</span>}
                      {d.receipt_id && <span className="text-ink-4">Recibo #{d.receipt_id}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("group")}>Agrupar de novo</Button>
                {c.membership.length > 0 && <Button size="sm" onClick={() => setDialog("detach")}>Tirar do fato</Button>}
                {story?.story_id && <Button size="sm" onClick={() => setDialog("merge")}>Juntar esta história a…</Button>}
              </div>
            </Step>
            <Step title="Envios" last meta={`${c.deliveries.length} registros`} tone={c.deliveries.some((d) => d.status === "unknown") ? "bad" : c.deliveries.length ? "accent" : "muted"}>
              {c.deliveries.length ? (
                <ul className="space-y-1">
                  {c.deliveries.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span>{d.target_key}</span>
                      <Badge tone={d.status === "sent" ? "ok" : d.status === "unknown" ? "bad" : "muted"}>{d.status}</Badge>
                      <span className="num text-ink-4">{bj(d.created_at)}{d.sent_at ? ` → ${bj(d.sent_at)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">Nenhum envio registrado</span>
              )}
            </Step>
          </ol>
        </Card>

        <div className="space-y-5">
          <Card title="Dados originais">
            <KV
              items={[
                ["Título original", a.title],
                ["Autor", a.author],
                ["Idioma", a.language],
                ["Chave de identidade", <span className="break-all font-mono text-[11.5px]">{a.identity_key}</span>],
              ]}
            />
          </Card>
          <Card title="Histórico de alterações">
            {c.history.length ? (
              <ul className="space-y-3 text-[12.5px]">
                {c.history.map((h, i) => (
                  <li key={i}>
                    <div className="text-ink-2"><span className="font-medium">{h.action}</span> · {h.actor} · {bj(h.created_at)}</div>
                    {h.reason && <div className="text-ink-3">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nenhuma ação manual</Empty>
            )}
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={dialog === "seo"}
        title={p?.indexable ? "Tirar da indexação" : "Marcar como indexável"}
        description={
          p?.indexable
            ? "A página volta a ter noindex e sai do sitemap; mesmo sendo destaque, não volta a ser indexada sozinha até ser marcada de novo."
            : "Por padrão a página de detalhe tem noindex, e os destaques são indexados automaticamente. Marcando (só se estiver pública), ela passa a index, entra no sitemap e vai no próximo envio do IndexNow. Use para conteúdo com valor próprio e resumo e texto completos."
        }
        confirmLabel={p?.indexable ? "Tirar da indexação" : "Marcar como indexável"}
        busy={pending === "seo"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/seo`, { indexed: !p?.indexable, reason }, { label: "seo", success: p?.indexable ? "Retirado da indexação" : "Marcado como indexável" })) !== null}
      />

      <ReasonDialog
        open={dialog === "visibility"}
        title="Visibilidade"
        description="A mudança vale ao mesmo tempo para site, API, RSS, MCP, fluxo de sincronização e índice de busca, e limpa o cache. Se a fonte pedir remoção, confirme antes a identidade de quem pede e o alcance do pedido."
        danger={visibility === "withdrawn"}
        confirmLabel="Aplicar"
        busy={pending === "visibility"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/visibility`, { visibility, reason, version }, { label: "visibility", success: "Visibilidade atualizada" })) !== null}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["public", "Pública", "Exibição normal"],
            ["summary-only", "Só resumo", "Sem o texto; mantém título e resumo"],
            ["withdrawn", "Retirada", "Sai de todos os canais; o link dá 404"],
          ] as const).map(([v, label, hint]) => (
            <label key={v} className={`cursor-pointer rounded-card p-3 ring-1 transition-colors ${visibility === v ? "bg-accent-soft ring-accent" : "ring-line-strong hover:bg-bg-sunk"}`}>
              <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
              <div className="text-[13.5px] font-medium text-ink">{label}</div>
              <div className="mt-0.5 text-[12px] text-ink-3">{hint}</div>
            </label>
          ))}
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "override"}
        title="Correção manual"
        description="O valor manual vale mais que o do modelo e não é sobrescrito em reprocessamentos; campo em branco não corrige nada, e apagar uma correção existente a remove."
        confirmLabel="Salvar correção"
        busy={pending === "override"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          const next: Record<string, unknown> = {};
          const clear: string[] = [];
          for (const k of ["title", "summary", "reason"] as const) {
            if (fields[k].trim()) next[k] = fields[k].trim();
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          if (fields.category) next.category = fields.category;
          else if (c.override?.fields.category !== undefined) clear.push("category");
          if (fields.tags.trim()) next.tags = fields.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
          else if (c.override?.fields.tags !== undefined) clear.push("tags");
          if (fields.scoreMode === "none") next.score = null;
          else if (fields.scoreMode === "value") next.score = Number(fields.score);
          else if (c.override?.fields.score !== undefined) clear.push("score");
          for (const k of ["selected", "silent"] as const) {
            if (fields[k] === "true" || fields[k] === "false") next[k] = fields[k] === "true";
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          return (await run("POST", `${base}/override`, { fields: next, clear, reason, version }, { label: "override", success: "Correção salva e republicada" })) !== null;
        }}
      >
        <Field label="Título"><Input value={fields.title} placeholder={p?.title ?? ""} onChange={(e) => setFields({ ...fields, title: e.target.value })} /></Field>
        <Field label="Resumo"><Textarea rows={3} value={fields.summary} placeholder={p?.summary ?? ""} onChange={(e) => setFields({ ...fields, summary: e.target.value })} /></Field>
        <Field label="Por que importa"><Textarea rows={2} value={fields.reason} placeholder={p?.reason ?? ""} onChange={(e) => setFields({ ...fields, reason: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Editoria">
            <Select value={fields.category} onChange={(e) => setFields({ ...fields, category: e.target.value })}>
              <option value="">Sem correção</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Field label="Etiquetas (separadas por vírgula)"><Input value={fields.tags} onChange={(e) => setFields({ ...fields, tags: e.target.value })} /></Field>
          <Field label="Nota">
            <Select value={fields.scoreMode} onChange={(e) => setFields({ ...fields, scoreMode: e.target.value })}>
              <option value="">A do modelo</option>
              <option value="none">Sem nota</option>
              <option value="value">Nota manual</option>
            </Select>
          </Field>
          {fields.scoreMode === "value" && <Field label="Nota (0–100)"><Input type="number" min={0} max={100} step="any" required value={fields.score} onChange={(e) => setFields({ ...fields, score: e.target.value })} /></Field>}
          <Field label="Destaque">
            <Select value={fields.selected} onChange={(e) => setFields({ ...fields, selected: e.target.value })}>
              <option value="">Decisão do modelo</option>
              <option value="true">Forçar nos destaques</option>
              <option value="false">Forçar fora dos destaques</option>
            </Select>
          </Field>
          <Field label="Notificação">
            <Select value={fields.silent} onChange={(e) => setFields({ ...fields, silent: e.target.value })}>
              <option value="">Normal</option>
              <option value="true">Silenciosa (destaque sem notificação)</option>
              <option value="false">Tirar o silêncio</option>
            </Select>
          </Field>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "analyze"}
        title="Reavaliar a revisão atual"
        description="Faz uma nova chamada de modelo (cobrada e com recibo). Cliques repetidos no mesmo envio não cobram duas vezes."
        requireReason={false}
        confirmLabel="Reavaliar"
        busy={pending === "analyze"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "analyze" }, { label: "analyze", success: "Colocado na fila de avaliação" })) !== null}
      />
      <ReasonDialog
        open={dialog === "presentation"}
        title="Atualizar exibição do texto"
        description="Primeiro confere mudanças de imagens, links e formatação na página original. Se o texto for o mesmo, mantém resumo, tradução, destaque e agrupamento."
        requireReason={false}
        confirmLabel={presentation?.ready && presentation.changed ? "Aplicar atualização" : "Ver mudanças"}
        busy={pending === "presentation"}
        onClose={() => setDialog(null)}
        onSubmit={async () => {
          const apply = presentation?.ready && presentation.changed;
          const result = await run<AdminPresentationRefresh>("POST", `${base}/rerun`,
            { step: "presentation", ...(apply ? { version: presentation.version } : { preview: true }) },
            { label: "presentation", revalidate: !!apply, ...(apply ? { success: "Exibição do texto atualizada" } : {}) });
          if (!result) { setPresentation(null); return false; }
          setPresentation(result);
          return result.applied;
        }}
      >
        {presentation && <div className="space-y-2 text-[13px] text-ink-2">
          <p>Imagens {presentation.images.before} → {presentation.images.after}, links {presentation.links.before} → {presentation.links.after}.</p>
          <p>{presentation.reason ?? (presentation.changed ? "Esta atualização pode ser aplicada." : "A exibição atual não precisa ser atualizada.")}</p>
          {presentation.translation === "reused" && <p>A tradução em português mantém o texto e sincroniza imagens e links.</p>}
        </div>}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === "extract"}
        title="Extrair o texto de novo"
        requireReason={false}
        confirmLabel="Extrair de novo"
        busy={pending === "extract"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "extract" }, { label: "extract", success: "Colocado na fila de extração" })) !== null}
      />
      <ReasonDialog
        open={dialog === "group"}
        title="Agrupar de novo"
        description="Agrupamentos feitos à mão não são sobrescritos."
        requireReason={false}
        confirmLabel="Agrupar de novo"
        busy={pending === "group"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "group" }, { label: "group", success: "Colocado na fila de agrupamento" })) !== null}
      />
      <ReasonDialog
        open={dialog === "detach"}
        title="Tirar do fato"
        description="Este conteúdo passa a aparecer sozinho, e a página do fato é atualizada."
        danger
        confirmLabel="Tirar"
        busy={pending === "detach"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/detach`, { reason }, { label: "detach", success: "Retirado do fato" })) !== null}
      />
      <ReasonDialog
        open={dialog === "merge"}
        title="Juntar histórias"
        description={`Junta a história #${story?.story_id} (${story?.story_title ?? ""}) a outra; os links antigos passam a redirecionar para a nova.`}
        danger
        confirmLabel="Juntar"
        busy={pending === "merge"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          if (!/^\d+$/.test(mergeInto.trim())) return false;
          return (await run("POST", "/api/admin/stories/merge", { from: story!.story_id, into: Number(mergeInto), reason }, { label: "merge", success: "Histórias unidas" })) !== null;
        }}
      >
        <Field label="Número da história de destino" hint="O #número aparece no diagnóstico de qualquer conteúdo da história de destino">
          <Input inputMode="numeric" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} placeholder="ex.: 1234" />
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
