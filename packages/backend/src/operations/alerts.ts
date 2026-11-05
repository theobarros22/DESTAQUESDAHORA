// Operations alerts. The person reading them is the site owner, not an engineer: each
// message says what readers see, whether it heals by itself and what, if anything, the owner must do.
//   now   — readers are affected and it has not healed: sent at once, repeated hourly, recovery reported.
//   today — money at risk or only the owner can act: sent at once, repeated at most daily, recovery reported.
//   later — other follow-ups: one 09:00 list a day for the agent (the owner's only without one). A source's follow-up is
//           closed on its own: a fix removes it, and one judged not worth fixing is closed with a reason.
// A finding with agentOnly is still now or today, but it only wakes the agent: nothing is sent when it
// opens, nothing is sent when it clears, and it stays off the 09:00 digest.
// A module can name those alerts as well, including `name:<item>`, so a row saved before the flag still closes quietly.
// With an agent taking the alerts (notify/agent.ts), a now or today problem that is not the owner's own
// (Finding.owner) is handed to the agent instead. The owner hears of it when the same problem is handed over
// a third time in a day, or when it is still open HANDED_MS after the handoff, and from then on as above;
// an incident the agent judged not a fault (holdAlert) is not told before its hold ends. The agent is not
// woken for what is the owner's alone (owner "only"). While the channel to the agent fails, the owner hears everything again.
// The shared hub owns serial execution and retry; accepted events are never dispatched again here.
// Delivery goes through sendAlert (alert webhook or ops chat, internal-chat fallback; off unless FEISHU_INTERNAL_ENABLED).
import { addDays, beijingAt, beijingDate, beijingDay, beijingStamp, isValidDate } from "@aihot/contracts/time";
import { ALERTS, EDITION_TIMES } from "@aihot/site";
import { audit } from "../audit.ts";
import { sql } from "../db.ts";
import { agentConfigured, agentTransportFindings, flushAgentEvents, handoffs, wakeAgent, wakeDigest } from "../notify/agent.ts";
import { duration, formatAlert, formatRecovery, formatReturn, sendAlert, type Finding, type Level } from "../notify/feishu.ts";
import { stepsOnService } from "../editorial/models.ts";
import { backupConfigured } from "./backup.ts";
import { GROUPING_WARN_AFTER_MS, waitingSelectedNews } from "./grouping.ts";
import { upstreamFindings } from "../media/upstream.ts";
import { serverModules } from "../modules.ts";
import { awaitingRelease, providerAccessRefused } from "../providers/receipts.ts";
import { SOURCE_PROBLEMS, sourceHealth } from "../sources/health.ts";

const REPEAT_MS: Record<Exclude<Level, "later">, number> = { now: 3600_000, today: 24 * 3600_000 };
/**
 * How long the agent has a problem before the owner hears of it too: readers affected now, the first hourly
 * reminder; otherwise time to ship a fix and retry it once (10-19..10-21 the agent closed its alerts within 25 minutes).
 */
const HANDED_MS: Record<Exclude<Level, "later">, number> = { now: 3600_000, today: 3 * 3600_000 };
/** The handoff that tells the owner a problem keeps coming back, counted over a day; told at most once a day. */
const RETURNS = 3;
const DAY_MS = 86_400_000;

// Valves default off: read at call time, only an explicit "true" turns them on.
const collecting = () => process.env.COLLECT_ENABLED === "true";
const modelsOn = () => process.env.MODEL_CALLS_ENABLED === "true";
/**
 * How long the site may go without a new article before it counts as stalled (ALERT_QUIET_MINUTES, else
 * the site's own setting; small source lists are quieter), and how long while editorial fetches keep
 * succeeding. At most a day: the check looks one day back.
 */
const QUIET_MINUTES = Math.min(Number(process.env.ALERT_QUIET_MINUTES || ALERTS.quietMinutes), 1440);
const QUIET_FETCHING_MINUTES = Math.min(Math.max(ALERTS.quietWhileFetchingMinutes, QUIET_MINUTES), 1440);

/** One check: the problems it finds now. `open` retains ongoing incidents, read once per round. */
type Check = (now: number, open: AlertState) => Promise<Finding[]>;

/** Everything checked every round, in the order the findings are listed. */
const CHECKS: Check[] = [
  // Readers affected now
  contentCollection,
  sourcesFailing,
  selectedGrouping,
  contentProcessing,
  dailyReportFindings,
  // Money, and things only the owner can do
  providerFindings,
  refusedDeliveries,
  backupAge,
  upstreamFindings,
  moduleAlerts,
  // Follow-ups
  sourceFollowUps,
  unknownOutcomes,
  agentTransportFindings,
  waitingQueues,
  moduleFollowUps,
];

/** Everything wrong right now, with its level. */
export async function collectFindings(now = Date.now(), open?: AlertState): Promise<Finding[]> {
  const announced = open ?? await alertState();
  const out: Finding[] = [];
  for (const check of CHECKS) out.push(...(await check(now, announced)));
  return out;
}

// Content flow, judged by outcome: whatever broke (worker, egress proxy, models, queues), readers see
// a site that stops changing. Its persisted backlog survives worker restarts and paused valves.
async function contentCollection(now: number, open: AlertState): Promise<Finding[]> {
  if (!collecting() && !open["content.collect"]) return [];
  const [last] = await sql<{ at: Date | null }[]>`SELECT max(a.discovered_at) AS at FROM articles a
    JOIN sources s ON s.id = a.source_id WHERE s.participation_mode = 'editorial' AND a.discovered_at > now() - interval '1 day'`;
  const quietFor = last?.at ? now - last.at.getTime() : Infinity;
  if (quietFor <= QUIET_MINUTES * 60_000) return [];
  // Fetches still succeeding with nothing new is the sources being quiet, not collection stopping.
  const [fetching] = quietFor <= QUIET_FETCHING_MINUTES * 60_000 ? await sql`SELECT 1 FROM fetch_runs f JOIN sources s ON s.id = f.source_id
    WHERE s.participation_mode = 'editorial' AND f.status = 'ok' AND f.started_at > ${new Date(now - QUIET_MINUTES * 60_000)} LIMIT 1` : [];
  if (fetching) return [];
  // A site without an enabled source has nothing to collect.
  const [anySource] = await sql`SELECT 1 FROM sources WHERE enabled AND participation_mode = 'editorial' LIMIT 1`;
  if (!anySource) return [];
  return [{
    key: "content.collect",
    level: "now",
    title: "O site parou de coletar matérias novas",
    impact: last?.at ? `Os leitores não veem matérias novas: a última foi coletada em ${beijingStamp(last.at)}` : "Os leitores não veem matérias novas: nenhuma matéria foi coletada em um dia",
    heals: ALERTS.usualFlow ? `Não, ${ALERTS.usualFlow}` : "Não",
    action: "Envie este alerta a uma IA para investigar e resolver",
    detail: quietFor <= QUIET_FETCHING_MINUTES * 60_000
      ? `editorial articles.discovered_at sem valor novo há mais de ${QUIET_MINUTES} minutos, sem nenhum editorial fetch_runs bem-sucedido no período (o sinal de calor é avaliado à parte); verifique worker, sources.schedule, proxy de saída e falhas de coleta`
      : `editorial articles.discovered_at sem valor novo há mais de ${QUIET_FETCHING_MINUTES} minutos (vale mesmo com coleta bem-sucedida); descubra por que a coleta devolve sempre new_count=0: parsing, deduplicação e gravação`,
    since: last?.at ?? undefined,
  }];
}

/**
 * Many sources failing at once points at the site's way out, not at the sources: the site keeps changing
 * with what still works, so the stall above stays quiet. Each enabled source counts by its latest fetch,
 * however long ago: a failing one waits hours before it is fetched again, and collection may be paused or the
 * worker down meanwhile, so only a fetch that works again is recovery. Production, 30 days to 2026-10-28:
 * the egress proxy dropped on 10-05, 10-17 and 10-26 and 23–37% of the sources were failing at the worst;
 * at no other time more than 11.5%. Fewer than 50 failing sources are each one's own follow-up.
 */
const FAILING_SHARE = 0.15;
const FAILING_SOURCES = 50;

async function sourcesFailing(now: number, open: AlertState): Promise<Finding[]> {
  if (!collecting() && !open["content.fetch"]) return [];
  const latest = sql`SELECT r.status, r.error, r.started_at FROM sources s CROSS JOIN LATERAL (
      SELECT status, error, started_at FROM fetch_runs f
      WHERE f.source_id = s.id AND f.status IN ('ok', 'failed') AND f.started_at <= ${new Date(now)}
      ORDER BY started_at DESC LIMIT 1) r
    WHERE s.enabled`;
  const [r] = await sql<{ fetched: number; failing: number }[]>`
    SELECT count(*)::int AS fetched, count(*) FILTER (WHERE status = 'failed')::int AS failing FROM (${latest}) l`;
  if (!r || r.failing < FAILING_SOURCES || r.failing < r.fetched * FAILING_SHARE) return [];
  const errors = await sql<{ error: string; n: number; first: Date }[]>`
    SELECT left(coalesce(error, ''), 120) AS error, count(*)::int AS n, min(started_at) AS first FROM (${latest}) l
    WHERE status = 'failed' GROUP BY 1 ORDER BY 2 DESC`;
  return [{
    key: "content.fetch",
    level: "now",
    title: "Muitas fontes falharam na coleta; as matérias novas delas não entram",
    impact: `Das ${r.fetched} fontes coletadas recentemente, ${r.failing} falharam na última coleta, e os leitores não veem as matérias novas delas por enquanto`,
    heals: "Quando a saída do servidor para a internet voltar, a coleta recomeça no agendamento e as matérias deste período chegam atrasadas; se a saída não voltar, elas não entram",
    action: "Encaminhe a uma IA para checar o proxy de saída e os erros de coleta",
    detail: `Fontes com falha: ${Math.round((r.failing / r.fetched) * 100)}% (limite ${FAILING_SHARE * 100}% e ao menos ${FAILING_SOURCES}); erros comuns: ${errors.slice(0, 3).map((e) => `${e.error || "(nenhum)"} ×${e.n}`).join("; ")}`,
    since: new Date(Math.min(...errors.map((e) => e.first.getTime()))),
  }];
}

/** Processing is checked while collection and models run, and while either of its incidents is open. */
const watchingProcessing = (open: AlertState) => (collecting() && modelsOn()) || !!open["content.grouping"] || !!open["content.process"];

async function selectedGrouping(now: number, open: AlertState): Promise<Finding[]> {
  if (!watchingProcessing(open)) return [];
  const waiting = (await waitingSelectedNews()).filter((item) => open["content.grouping"] || now - item.since.getTime() >= GROUPING_WARN_AFTER_MS);
  if (!waiting.length) return [];
  const manual = waiting.filter((item) => item.recovery === "manual").length;
  const receipt = waiting.some((item) => item.recovery === "receipt");
  return [{
    key: "content.grouping",
    level: "now",
    title: "Há destaques presos na confirmação de duplicidade, ainda não publicados",
    impact: `${waiting.length} matérias que já atingiram o critério de destaque ainda não concluíram a confirmação de duplicidade e não entraram nos destaques; os leitores podem demorar a vê-las`,
    heals: manual ? `${manual} precisam de tratamento manual para seguir${manual < waiting.length ? "; as demais ainda se recuperam sozinhas" : ""}`
      : receipt ? "Ainda aguardando recuperação automática; requisições pagas com resultado desconhecido são liberadas uma vez após 30 minutos" : "Vai tentar de novo sozinho, mas a espera já passou do normal",
    action: manual ? "Encaminhe a uma IA; confira a cobrança ou, dentro da autorização de recuperação existente, registre a cobrança como desconhecida e libere" : "Encaminhe a uma IA para checar o motivo da espera e evitar acúmulo",
    detail: waiting.slice(0, 8).map((item) => `${item.articleId}${item.receiptId ? ` recibo #${item.receiptId}` : ""}${item.error ? `: ${item.error.slice(0, 120)}` : ""}`).join("; "),
    since: waiting[0]!.since,
  }];
}

async function contentProcessing(now: number, open: AlertState): Promise<Finding[]> {
  if (!watchingProcessing(open)) return [];
  // An article still new two hours after discovery is overdue, and one failed in the last three hours counts.
  // While an announced incident is open, the windows stay where its first detection put them: time passing
  // cannot remove unfinished articles from it. The alert's duration starts at detection, not article age.
  const incident = open["content.process"];
  const detectedAt = incident ? Math.min(now, Date.parse(incident.since)) : now;
  const overdueBefore = now - 2 * 3600_000;
  const waitingAfter = new Date(detectedAt - 2 * 86400_000);
  const waitingBefore = new Date(incident ? Math.max(overdueBefore, detectedAt) : overdueBefore);
  const failedAfter = new Date(detectedAt - 3 * 3600_000);
  const unfinished = sql`(processing_state = 'new' AND discovered_at > ${waitingAfter} AND discovered_at < ${waitingBefore})
    OR (processing_state = 'failed' AND discovered_at > ${failedAfter})`;
  const [p] = await sql<{ waiting: number; failed: number; oldest: Date | null }[]>`
    SELECT count(*) FILTER (WHERE processing_state = 'new')::int AS waiting,
           count(*) FILTER (WHERE processing_state = 'failed')::int AS failed,
           min(discovered_at) FILTER (WHERE processing_state = 'new') AS oldest
    FROM articles WHERE ${unfinished}`;
  if (p!.waiting < 10 && p!.failed < 20 && !(incident && p!.waiting + p!.failed > 0)) return [];
  const errors = await sql<{ error: string; n: number }[]>`
    SELECT left(coalesce(processing_error, '(nenhum)'), 120) AS error, count(*)::int AS n FROM articles
    WHERE (${unfinished}) AND processing_error IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 3`;
  return [{
    key: "content.process",
    level: "now",
    title: "Conteúdo novo travado, não chega ao site",
    impact: [p!.waiting > 0 && `${p!.waiting} matérias acumuladas ainda aguardam processamento`, p!.failed > 0 && `${p!.failed} matérias com falha de processamento ainda não foram refeitas`]
      .filter(Boolean)
      .join("; ") + "; os destaques e os assuntos em alta ficarão sem conteúdo",
    heals: p!.failed > 0 ? "As matérias que falharam precisam ser reprocessadas; o serviço voltar não significa que o acúmulo foi resolvido" : "As matérias na fila continuam sendo processadas, mas ainda é preciso confirmar que terminaram",
    action: "Encaminhe a uma IA",
    // Article age is useful detail; incident duration starts at first detection.
    detail: [p!.oldest && `A mais antiga entrou em ${beijingStamp(p!.oldest)}`, errors.map((e) => `${e.error} (${e.n})`).join("; ") || "Nenhum erro registrado"].filter(Boolean).join("; "),
  }];
}

// Content-group pushes the Feishu webhook refused (a removed bot, a changed address); nothing resends them.
async function refusedDeliveries(now: number, open: AlertState): Promise<Finding[]> {
  const incident = open["deliveries.failed"];
  const since = new Date((incident ? Date.parse(incident.since) : now) - 86400_000);
  const [refused] = await sql<{ n: number; target: string | null; response: string | null }[]>`
    SELECT count(*)::int AS n, max(t.note) AS target, left(max(d.response), 200) AS response FROM deliveries d JOIN notify_targets t ON t.key = d.target_key
    WHERE d.updated_at > ${since}
      AND (d.status = 'failed' OR (${!!incident} AND (d.status = 'unknown' OR (d.status IN ('pending','sending') AND d.attempts > 0))))
      AND NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.action = 'delivery.drop'
        AND a.subject = 'delivery:' || d.id AND a.created_at >= d.updated_at)`;
  if (!refused!.n) return [];
  return [{
    key: "deliveries.failed",
    level: "today",
    title: "Há envios ao grupo de conteúdo que não saíram",
    impact: `${refused!.n} notificações ainda sem confirmação de entrega em ${refused!.target ?? "grupo de conteúdo"}`,
    heals: "Não reenvia sozinho",
    action: "Encaminhe a uma IA; se o robô foi removido do grupo, você precisa adicioná-lo de volta",
    detail: refused!.response ?? "",
  }];
}

async function backupAge(now: number): Promise<Finding[]> {
  if (!backupConfigured()) return [];
  const [b] = await sql<{ value: { at: string; uploaded: boolean; filesError?: string } }[]>`SELECT value FROM settings WHERE key = 'backup.last'`;
  // A failed archive updates backup.last too. Reuse the run history so repeated failures cannot
  // reset the age; before the first success, count from the first attempt rather than from now.
  const [runs] = await sql<{ last_ok: Date | null; first_attempt: Date | null }[]>`
    SELECT max(finished_at) FILTER (WHERE status = 'ok') AS last_ok, min(started_at) AS first_attempt
    FROM job_runs WHERE job = 'ops.backup'`;
  const lastOk = Math.max(runs?.last_ok?.getTime() ?? 0, b?.value.uploaded ? Date.parse(b.value.at) : 0);
  const since = lastOk || runs?.first_attempt?.getTime() || now;
  const age = now - since;
  const state = b?.value.filesError ? `Banco enviado, mas o empacotamento dos anexos falhou: ${b.value.filesError}` : b?.value.uploaded === false ? "Não enviado" : "";
  if (age > 50 * 3600_000) {
    return [{
      key: "backup.failed",
      level: "today",
      title: "O backup do banco falhou por dois dias seguidos",
      impact: lastOk ? `Se o servidor tiver problema, os dados dos últimos ${duration(age)} podem não ser totalmente recuperáveis` : "Ainda não há backup completo bem-sucedido; se o servidor tiver problema, os dados podem não ser recuperáveis",
      heals: "Não",
      action: "Encaminhe a uma IA",
      detail: `${lastOk ? "Último sucesso" : "Primeira tentativa de backup"} ${beijingStamp(since)}${state ? `; ${state}` : ""}; veja o registro de execução de ops.backup`,
      since: new Date(since),
    }];
  }
  if (!b || !b.value.uploaded || age > 30 * 3600_000) {
    return [{ key: "backup.stale", level: "later", title: "O backup do banco está há mais de um dia sem sucesso", detail: b ? `Último em ${beijingStamp(b.value.at)}${state ? ` (${state})` : ""}; veja ops.backup` : "Ainda não há registro de backup bem-sucedido" }];
  }
  return [];
}

/** What the site's modules find. */
async function moduleAlerts(now: number): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const m of serverModules()) if (m.alerts) out.push(...(await m.alerts(now)));
  return out;
}

/**
 * One follow-up per source and problem, so fixing a source removes its own line. A quiet source is left to
 * the weekly report: being slow, or too new to have a rhythm, is nothing anyone can fix, and may never end.
 */
async function sourceFollowUps(now: number): Promise<Finding[]> {
  if (!collecting()) return [];
  return (await sourceHealth(now)).flatMap(group => SOURCE_PROBLEMS.flatMap(p => group[p.problem].map((s): Finding => ({
    key: `sources.${p.problem}.${s.id}`, level: "later", title: `${group.name}: fonte "${s.name}" ${p.title}`,
    detail: `${s.id}：${p.describe(s)}；${p.action}`, observedAt: p.observedAt(s) ?? undefined,
  }))));
}

/** Paid requests and content-group pushes whose outcome is not known yet. */
async function unknownOutcomes(): Promise<Finding[]> {
  const out: Finding[] = [];

  const [r] = await sql<{ receipts: number; services: string | null; deliveries: number }[]>`
    SELECT (SELECT count(*)::int FROM receipts WHERE ${awaitingRelease()}) AS receipts,
           (SELECT string_agg(DISTINCT service || '/' || purpose, '、') FROM receipts WHERE ${awaitingRelease()}) AS services,
           (SELECT count(*)::int FROM deliveries WHERE status = 'unknown') AS deliveries`;
  if (r!.receipts > 0) {
    out.push({ key: "receipts.unknown", level: "later", title: `${r!.receipts} requisições pagas com resultado ainda não confirmado`, detail: `${r!.services}; as que ainda bloqueiam a publicação de conteúdo precisam de conferência de cobrança ou liberação pela autorização existente` });
  }
  if (r!.deliveries > 0) out.push({ key: "deliveries.unknown", level: "later", title: `${r!.deliveries} envios ao grupo de conteúdo sem certeza de entrega`, detail: "Confira no grupo de conteúdo se saíram, depois marque ou reenvie" });
  return out;
}

/** Runnable jobs (deferred ones excluded) that have waited more than two hours. */
async function waitingQueues(now: number): Promise<Finding[]> {
  const queues = await sql<{ name: string; n: number; oldest: Date }[]>`
    SELECT name, count(*)::int AS n, min(start_after) AS oldest FROM pgboss.job
    WHERE state IN ('created', 'retry') AND start_after <= now() AND name NOT LIKE 'cron.%' GROUP BY 1`;
  return queues.filter((q) => now - q.oldest.getTime() > 2 * 3600_000).map((q): Finding => (
    { key: `queue.${q.name}`, level: "later", title: `Tarefa de fundo na fila há mais de 2 horas: ${q.name}`, detail: `${q.n} aguardando, a mais antiga espera há ${duration(now - q.oldest.getTime())}` }));
}

/** The site's modules' follow-ups. */
async function moduleFollowUps(now: number): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const m of serverModules()) if (m.followUps) out.push(...(await m.followUps(now)));
  return out;
}

/** Current routing describes possible impact; recent failed calls do not prove every step has stopped. */
async function modelStops(service: string, models?: ReadonlySet<string>): Promise<string> {
  const steps = await stepsOnService(service, models);
  return steps.length ? `${steps.join(", ")} podem ser afetados` : "Nenhuma etapa de processamento usa este provedor de modelo no momento";
}
/** `stops` is for the services that are not models; a model service's follows from the steps that use it. */
const PROVIDERS: Record<string, { name: string; where: string; stops?: string }> = {
  llm: { name: "Provedor de modelo padrão", where: "o painel do provedor de modelo" },
  zhipu: { name: "Zhipu", where: "a plataforma aberta da Zhipu" },
  dashscope: { name: "Alibaba Cloud Bailian", where: "o console do Alibaba Cloud Bailian" },
  deepseek: { name: "DeepSeek", where: "a plataforma aberta da DeepSeek" },
  mimo: { name: "Xiaomi MiMo", where: "a plataforma aberta da Xiaomi MiMo" },
  socialdata: { name: "SocialData", stops: "Conteúdo novo do X (Twitter) deixa de chegar", where: "o painel do SocialData" },
  jina: { name: "Jina", stops: "O texto de algumas matérias não é obtido", where: "o painel do Jina" },
  dajiala: { name: "Dajiala", stops: "Matérias novas de contas do WeChat deixam de chegar", where: "o painel do Dajiala" },
};
export const providerName = (service: string) => PROVIDERS[service]?.name ?? service;
export const providerStops = async (service: string, models?: ReadonlySet<string>): Promise<string> => {
  const p = PROVIDERS[service];
  return p ? (p.stops ?? modelStops(service, models)) : "Funções relacionadas pararam";
};
export const providerConsole = (service: string) => PROVIDERS[service]?.where ?? `o painel de ${service}`;

const REFUSED_PREFIX = "provider.refused.";

/** Paid services that refuse us (no balance, a dead key), and daily budgets used up. */
async function providerFindings(now: number, open: AlertState): Promise<Finding[]> {
  const out: Finding[] = [];
  const ongoing = Object.keys(open).filter(key => key.startsWith(REFUSED_PREFIX)).map(key => key.slice(REFUSED_PREFIX.length).split(":")[0]!);
  const failures = await sql<{ service: string; model: string | null; error: string; n: number; latest: Date }[]>`
    SELECT service, model, error, count(*)::int AS n, max(started_at) AS latest FROM receipt_attempts a
    WHERE status = 'failed' AND (started_at > ${new Date(now - 3600_000)} OR service = ANY(${ongoing})) AND error IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM receipt_attempts good WHERE good.service = a.service AND good.model IS NOT DISTINCT FROM a.model AND good.status = 'received' AND good.started_at > a.started_at)
    GROUP BY service, model, error ORDER BY latest DESC`;
  const models = new Map<string, { service: string; model: string | null; n: number; last: string; latest: number }>();
  for (const p of failures) {
    if (!providerAccessRefused(p.service, p.error)) continue;
    const key = `${REFUSED_PREFIX}${p.service}${p.model === null ? "" : `:${encodeURIComponent(p.model)}`}`;
    const summary = models.get(key) ?? { service: p.service, model: p.model, n: 0, last: p.error.slice(0, 200), latest: p.latest.getTime() };
    summary.n += p.n;
    models.set(key, summary);
  }
  // Earlier versions combined every model under a service key without saving its scope. Freeze the
  // unresolved models once for those existing events; their old timestamps cannot establish that scope.
  for (const [key, incident] of Object.entries(open)) {
    if (!key.startsWith(REFUSED_PREFIX) || key.includes(":") || incident.refusedModels) continue;
    const service = key.slice(REFUSED_PREFIX.length);
    incident.refusedModels = [...models.values()].filter(p => p.service === service).map(p => p.model);
  }
  const refused = new Map<string, { service: string; n: number; last: string; models?: Set<string> }>();
  for (const [modelKey, p] of models) {
    const legacyKey = `${REFUSED_PREFIX}${p.service}`;
    const legacy = open[legacyKey];
    const key = legacy?.refusedModels?.includes(p.model) ? legacyKey : modelKey;
    if (!open[key] && p.latest <= now - 3600_000) continue;
    const summary = refused.get(key) ?? { service: p.service, n: 0, last: p.last, models: new Set<string>() };
    summary.n += p.n;
    if (p.model === null) summary.models = undefined;
    else summary.models?.add(p.model);
    refused.set(key, summary);
  }
  for (const [key, p] of refused) {
    const service = p.service;
    const unused = p.models && !PROVIDERS[service]?.stops && !(await stepsOnService(service, p.models)).length;
    out.push({
      key,
      level: unused ? "later" : "today",
      ...(unused ? {} : { owner: true as const }),
      title: unused ? `Limites antigos de modelo do ${providerName(service)} ainda não verificados` : `${providerName(service)} recusou chamadas; confira a conta ou a cota`,
      impact: unused ? "As etapas de processamento atuais não usam esses modelos limitados; os limites antigos ainda não foram verificados" : await providerStops(service, p.models),
      heals: "É preciso restabelecer o acesso e depois confirmar que as tarefas que falharam seguiram",
      action: `Abra ${providerConsole(service)} e veja saldo, plano e limite de gasto; depois de recarregar ou restabelecer, peça a uma IA para verificar as chamadas e refazer as tarefas que acabaram de falhar (se o painel parecer normal, envie este alerta a uma IA para investigar a causa)`,
      detail: `${p.models ? `Modelos ${[...p.models].join(", ")}; ` : ""}Recusado ${p.n} vezes desde o último sucesso, sem nova chamada bem-sucedida: ${p.last}`,
    });
  }
  const capped = await sql<{ service: string; per_day: number; used: number }[]>`
    SELECT b.service, b.per_day, count(a.id)::int AS used FROM budgets b
    JOIN receipt_attempts a ON a.service = b.service AND a.origin = 'live' AND a.started_at > now() - interval '1 day'
    WHERE b.per_day > 0 GROUP BY 1, 2 HAVING count(a.id) >= b.per_day`;
  for (const c of capped) {
    out.push({
      key: `budget.day.${c.service}`,
      level: "later",
      title: `A cota de chamadas de ${providerName(c.service)} nas últimas 24 horas acabou`,
      impact: `${await providerStops(c.service)}, até a cota abrir espaço com o tempo`,
      heals: "Sim, a cota se recupera em janela móvel de 24 horas",
      action: "Nada a fazer agora; se for frequente, decida se vale aumentar a cota",
      detail: `${c.used} chamadas em 24 horas, limite ${c.per_day} (tabela budgets)`,
    });
  }
  return out;
}

interface AlertState {
  [key: string]: { title: string; since: string; sentAt?: string; agentOnly?: true; handedAt?: string; refusedModels?: (string | null)[] };
}

const DAILY_PREFIX = "report.daily:";
const dailyDate = (key: string) => key.startsWith(DAILY_PREFIX) && isValidDate(key.slice(DAILY_PREFIX.length))
  ? key.slice(DAILY_PREFIX.length) : undefined;
/** Missing dailies are looked for, and announced ones followed, over the last seven Beijing calendar days. */
const dailyScanFrom = (now: number) => addDays(beijingDate(now), -6);

async function alertState(): Promise<AlertState> {
  const [row] = await sql<{ value: AlertState }[]>`SELECT value FROM settings WHERE key = 'alerts.state'`;
  return { ...(row?.value ?? {}) };
}

/** When the owner was last told that a problem keeps coming back, by key, for the last day. */
async function returnsTold(now: number): Promise<Record<string, string>> {
  const [row] = await sql<{ value: Record<string, string> }[]>`SELECT value FROM settings WHERE key = 'alerts.returns'`;
  return Object.fromEntries(Object.entries(row?.value ?? {}).filter(([, at]) => now - Date.parse(at) < DAY_MS));
}

/** A handed-over incident the agent judged not a fault: until when and why. `since` ties it to that incident. */
export interface HeldAlert { since: string; until: string; reason: string; by: string; at: string }

async function savedHolds(): Promise<Record<string, HeldAlert>> {
  const [row] = await sql<{ value: Record<string, HeldAlert> }[]>`SELECT value FROM settings WHERE key = 'alerts.held'`;
  return row?.value ?? {};
}

/**
 * The agent looked at an incident it was handed and judged it not a fault (10-25: a quiet Saturday morning
 * escalated as "parou de coletar"): the owner is not told of that incident before `until`, a day at most. Past it, or
 * for a later incident, the handoff runs as before. Audited.
 */
export async function holdAlert(key: string, reason: string, until: Date, actor: string, now = Date.now()): Promise<HeldAlert> {
  if (!reason?.trim()) throw new Error("reason is required");
  if (!(until.getTime() > now && until.getTime() <= now + DAY_MS)) throw new Error("hold until a time within the next day");
  const open = (await alertState())[key];
  if (!open?.handedAt || open.sentAt) throw new Error(`not an open incident the agent has and the owner was not told of: ${key}`);
  const before = (await savedHolds())[key] ?? null;
  const held: HeldAlert = { since: open.since, until: until.toISOString(), reason: reason.trim(), by: actor, at: new Date(now).toISOString() };
  await sql.begin(async (tx) => {
    // Merged by key in the row itself, so holds written at the same time all stand; ended ones are dropped here.
    await tx`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.held', ${tx.json({ [key]: held } as never)}, ${actor})
             ON CONFLICT (key) DO UPDATE SET value = coalesce((SELECT jsonb_object_agg(k, v) FROM jsonb_each(settings.value) AS e(k, v)
               WHERE (v->>'until')::timestamptz > ${new Date(now)}), '{}'::jsonb) || EXCLUDED.value,
               updated_by = EXCLUDED.updated_by, updated_at = now()`;
    await audit(actor, "alert.hold", `alert:${key}`, held.reason, before, held, { db: tx });
  });
  return held;
}

async function dailyReportFindings(now: number, open: AlertState): Promise<Finding[]> {
  if (!collecting() || !modelsOn()) return [];
  const today = beijingDate(now);
  const [activity] = await sql<{ first_report: string | null; first_attempt: Date | null }[]>`
    SELECT (SELECT min(key) FROM reports WHERE kind = 'daily') AS first_report,
           (SELECT min(started_at) FROM job_runs WHERE job = 'reports.compose') AS first_attempt`;
  const starts = [activity?.first_report, activity?.first_attempt && beijingDate(activity.first_attempt)]
    .filter((date): date is string => !!date && isValidDate(date)).sort();
  const start = starts[0] ?? today;
  // New gaps and announced editions alike are followed for the scan window; settleDailies closes older ones.
  const from = dailyScanFrom(now);
  const dates = new Set(Object.keys(open).map(dailyDate).filter((date): date is string => !!date && date >= from));
  for (let date = from; date <= today; date = addDays(date, 1)) {
    if (date >= start) dates.add(date);
  }
  const overdue = [...dates].filter(date => now >= beijingAt(date, EDITION_TIMES.daily).getTime() + 2 * 3600_000).sort();
  if (!overdue.length) return [];
  const published = new Set((await sql<{ key: string }[]>`SELECT key FROM reports WHERE kind = 'daily' AND key IN ${sql(overdue)}`).map(r => r.key));
  return overdue.filter(date => !published.has(date)).map(date => ({
    key: `${DAILY_PREFIX}${date}`, level: "now",
    title: `O boletim de ${date} ainda não foi gerado`, impact: `Os leitores não veem o boletim de ${date}`,
    heals: "Ainda não foi refeito; confira o registro de execução para ver se é preciso refazer à mão",
    action: "Envie este alerta a uma IA para investigar e refazer",
    detail: `reports daily ${date} não existe; veja o registro de execução de reports.compose`,
  }));
}

/**
 * Announced editions this round did not find, because generation is paused or they fell out of the scan
 * window. Only an edition that exists has recovered (checkAlerts says so); one still missing stays open
 * quietly within the window, and past it is closed with one message instead of being reminded about forever.
 */
async function settleDailies(open: AlertState, found: Set<string>, now: number): Promise<{ missing: Set<string>; sent: string[] }> {
  const missing = new Set<string>();
  const sent: string[] = [];
  const dates = Object.keys(open).filter((key) => !found.has(key)).map(dailyDate).filter((date): date is string => !!date);
  if (!dates.length) return { missing, sent };
  const published = new Set((await sql<{ key: string }[]>`SELECT key FROM reports WHERE kind = 'daily' AND key IN ${sql(dates)}`).map((r) => r.key));
  for (const date of dates.filter((date) => !published.has(date))) {
    const key = `${DAILY_PREFIX}${date}`;
    if (date >= dailyScanFrom(now)) {
      missing.add(key);
      continue;
    }
    await sendAlert(`O boletim de ${date} não pôde ser refeito; alertas encerrados`, [`Os leitores não veem o boletim de ${date}; a edição falta desde ${beijingStamp(new Date(open[key]!.since))}, além da janela de checagem de sete dias`]);
    sent.push(`${key}:expired`);
    delete open[key];
  }
  return { missing, sent };
}

/**
 * Every 10 minutes: new problems and recoveries of the now/today levels go out; follow-ups wait for 09:00.
 */
export async function checkAlerts(now = Date.now()) {
  const state = await alertState();
  const all = await collectFindings(now, state);
  const handing = agentConfigured() && !all.some((f) => f.key === "webhook.transport");
  const returns = await returnsTold(now);
  const holds = await savedHolds();
  const sent: string[] = [];
  for (const f of all) {
    const open = state[f.key];
    if (f.level === "later") {
      // Switching before the first check changes the impact, not whether access has recovered.
      if (f.key.startsWith(REFUSED_PREFIX) && !open) state[f.key] = { title: f.title, since: new Date(now).toISOString() };
      continue;
    }
    if (f.agentOnly) {
      const since = open?.since ?? (f.since ?? new Date(now)).toISOString();
      state[f.key] = { title: f.title, since, agentOnly: true };
      continue;
    }
    if (handing && !f.owner && !open?.sentAt) {
      const handedAt = open?.handedAt ?? new Date(now).toISOString();
      const hold = holds[f.key];
      const held = !!hold && hold.since === open?.since && now < Date.parse(hold.until);
      if (held || now - Date.parse(handedAt) < HANDED_MS[f.level]) {
        // Before this round's handoff is published, the earlier ones of the day are counted.
        const earlier = open || returns[f.key] ? 0 : await handoffs(f.key, new Date(now - DAY_MS));
        if (earlier >= RETURNS - 1) {
          const msg = formatReturn(f, earlier + 1);
          await sendAlert(msg.title, msg.lines);
          returns[f.key] = new Date(now).toISOString();
          sent.push(`${f.key}:repeated`);
        }
        state[f.key] = { title: f.title, since: open?.since ?? (f.since ?? new Date(now)).toISOString(), handedAt };
        continue;
      }
    }
    if (open?.sentAt && now - Date.parse(open.sentAt) <= REPEAT_MS[f.level]) continue;
    const since = open ? new Date(open.since) : (f.since ?? new Date(now));
    // Claim AI was notified only after the hub actually accepts this incident's wake; persist the occurrence
    // timestamp first so a failed owner send or crash after waking cannot mint a second incident ID on retry.
    let woken = false;
    if (handing && f.key !== "webhook.transport" && f.owner !== "only" && f.action === "Envie este alerta a uma IA para investigar e resolver") {
      if (!open) {
        const entry = { title: f.title, since: since.toISOString() };
        state[f.key] = entry;
        await sql`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.state', ${sql.json({ [f.key]: entry } as never)}, 'alerts')
                  ON CONFLICT (key) DO UPDATE SET value = coalesce(settings.value, '{}'::jsonb) || ${sql.json({ [f.key]: entry } as never)}, updated_at = now()`;
      }
      woken = await wakeAgent({ ...f, since }, now);
    }
    // A problem the agent has had and not closed: the owner learns it is the agent's, and for how long.
    const shown = handing && !f.owner && open?.handedAt
      ? { ...f, heals: `A IA assumiu há ${duration(now - Date.parse(open.handedAt))} e ainda não resolveu`, action: "Pergunte à IA onde travou; o que depender de você, ela explica" }
      : woken
        ? { ...f, action: "Uma IA já foi avisada automaticamente para investigar e resolver; você será chamado se ela não conseguir ou se precisar de uma decisão; ao normalizar, sai mais uma notificação" }
        : f;
    const msg = formatAlert(shown, since, now, !!open?.sentAt);
    await sendAlert(msg.title, msg.lines);
    state[f.key] = { ...open, title: f.title, since: since.toISOString(), sentAt: new Date(now).toISOString() };
    sent.push(f.key);
  }
  const found = new Set(all.map((f) => f.key));
  const dailies = await settleDailies(state, found, now);
  sent.push(...dailies.sent);
  for (const [key, open] of Object.entries(state)) {
    if (found.has(key) || dailies.missing.has(key)) continue;
    // An agent-only incident was never told to the owner, so clearing it stays quiet too.
    if (open.agentOnly || !open.sentAt) {
      delete state[key];
      continue;
    }
    const [dropped] = key === "deliveries.failed" ? await sql`SELECT count(*)::int AS n FROM deliveries d
      WHERE d.status='failed' AND d.updated_at>${new Date(Date.parse(open.since)-86400_000)}
        AND EXISTS(SELECT 1 FROM audit_log a WHERE a.action='delivery.drop' AND a.subject='delivery:' || d.id AND a.created_at>=d.updated_at)` : [];
    const msg = formatRecovery(open.title, new Date(open.since), now);
    if (dropped?.n) await sendAlert(`Acompanhamento encerrado: ${open.title}`, [`${dropped.n} notificações antigas não serão mais reenviadas e não tiveram entrega confirmada`]);
    else await sendAlert(msg.title, msg.lines);
    sent.push(`${key}:${dropped?.n ? "closed" : "recovered"}`);
    delete state[key];
  }
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.state', ${sql.json(state as never)}, 'alerts')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.returns', ${sql.json(returns)}, 'alerts')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  // Revisit every open incident: a crash between saving the owner's alert and dispatching cannot lose it.
  // Transport receipts retain IDs across uncertain responses, independently from owner reminders.
  for (const f of all) if (f.level !== "later" && f.key !== "webhook.transport" && f.owner !== "only" && state[f.key]) {
    await wakeAgent({ ...f, since: new Date(state[f.key]!.since) }, now);
  }
  await flushAgentEvents();
  return { open: Object.keys(state), sent };
}

/**
 * What a closure covers. "observed": the failures seen by its time (a fix whose old failures still sit in
 * the window): any new one reopens it, as on 10-17 when HN detail failures went on after "fixed". "ongoing":
 * the condition itself, judged acceptable (an upstream that fails a few times a day and recovers, dates
 * missing by rule): it holds through new failures for a week, then the condition is listed and judged again.
 * A source that stops working is another follow-up (`sources.failing.*`), never covered by either.
 */
export type ClosureScope = "observed" | "ongoing";
const ONGOING_CLOSURE_MS = 7 * 86_400_000;

/** A follow-up someone judged not worth fixing: who, when and why; `until` ends an ongoing closure. */
export interface DismissedFollowUp { title: string; reason: string; by: string; at: string; until?: string }

/** The follow-ups closed as not to be fixed, by key. */
async function savedDismissals(): Promise<Record<string, DismissedFollowUp>> {
  const [row] = await sql<{ value: Record<string, DismissedFollowUp> }[]>`SELECT value FROM settings WHERE key = 'alerts.dismissed'`;
  return row?.value ?? {};
}

/** The closures still covering a current follow-up (ClosureScope). */
export async function dismissedFollowUps(findings?: Finding[], now = Date.now()): Promise<Record<string, DismissedFollowUp>> {
  const current = findings ?? await sourceFollowUps(now);
  return Object.fromEntries(Object.entries(await savedDismissals()).filter(([key, closed]) => {
    const finding = current.find(f => f.key === key);
    if (!finding) return false;
    if (closed.until) return now < Date.parse(closed.until);
    return !finding.observedAt || finding.observedAt.getTime() <= Date.parse(closed.at);
  }));
}

/**
 * Closes a current source follow-up as not to be fixed, with the reason (audited): the digest stops listing
 * it. Only these name one source and one problem; a follow-up that counts many records would hide records
 * that arrive later. `scope` says what it covers (ClosureScope); disappearance also lapses the closure.
 */
export async function dismissFollowUp(key: string, reason: string, actor: string, now = Date.now(), scope: ClosureScope = "observed"): Promise<DismissedFollowUp> {
  if (!reason?.trim()) throw new Error("reason is required");
  const finding = (await sourceFollowUps(now)).find((f) => f.key === key);
  if (!finding) throw new Error(`not a current source follow-up: ${key}`);
  const before = (await savedDismissals())[key] ?? null;
  const dismissed: DismissedFollowUp = { title: finding.title, reason: reason.trim(), by: actor, at: new Date(now).toISOString(),
    ...(scope === "ongoing" ? { until: new Date(now + ONGOING_CLOSURE_MS).toISOString() } : {}) };
  await sql.begin(async (tx) => {
    await tx`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.dismissed', ${tx.json({ [key]: dismissed } as never)}, ${actor})
             ON CONFLICT (key) DO UPDATE SET value = settings.value || EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
    await audit(actor, "followup.dismiss", `followup:${key}`, dismissed.reason, before, dismissed, { db: tx });
  });
  return dismissed;
}

/** Undoes a closure (audited): the digest lists the follow-up again while it lasts. Null when it is not closed. */
export async function restoreFollowUp(key: string, reason: string, actor: string): Promise<DismissedFollowUp | null> {
  if (!reason?.trim()) throw new Error("reason is required");
  const before = (await savedDismissals())[key];
  if (!before) return null;
  await sql.begin(async (tx) => {
    await tx`UPDATE settings SET value = value - ${key}::text, updated_by = ${actor}, updated_at = now() WHERE key = 'alerts.dismissed'`;
    await audit(actor, "followup.restore", `followup:${key}`, reason.trim(), before, null, { db: tx });
  });
  return before;
}

/** 09:00: the open follow-ups, one list; nothing when there are none. Closures whose problem is gone lapse here.
 *  Agent-only handoffs stay on the ops list and are not part of the owner's message. */
export async function sendDigest(now = Date.now()) {
  const found = (await collectFindings(now)).filter((f) => f.level === "later");
  const dismissed = await dismissedFollowUps(found, now);
  const lapsed = Object.keys(await savedDismissals()).filter((key) => !dismissed[key]);
  if (lapsed.length) await sql`UPDATE settings SET value = value - ${sql.array(lapsed)}::text[], updated_at = now() WHERE key = 'alerts.dismissed'`;
  const items = found.filter((f) => !dismissed[f.key] && !f.agentOnly);
  const lines = items.map((f, i) => `${i + 1}. ${f.title}${f.detail ? `\n   ${f.detail}` : ""}`);
  // Once the hub has the list, the agent works through it alone and passes on what is still the owner's. Without
  // an agent, or when the list did not get through, the owner gets it as before.
  const taken = found.some(f => !dismissed[f.key]) && await wakeDigest(beijingDate(now), lines.length || found.length);
  const toldOwner = lines.length > 0 && !taken;
  if (toldOwner) await sendAlert(`📋 Relatório diário do sistema · ${beijingDay(now)}`, ["Os itens abaixo precisam de acompanhamento; veja o impacto em cada um e, se quiser, encaminhe tudo a uma IA.", ...lines]);
  await flushAgentEvents();
  return { items: lines.length, toldOwner };
}
