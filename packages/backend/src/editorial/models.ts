// Model per capability: the code default (the site's choice in site/models.ts, else `default`, the deployment's
// own model), an environment override, and an admin switch kept in settings (every switch is audited).
// Read at call time and cached for a minute, so a switch applies to the next call without a restart; a
// changed model only affects work done from then on (history is not re-judged).
import { READER_WORDING } from "@aihot/industry/wording";
import { DEFAULTS } from "@aihot/site/models";
import { sql } from "../db.ts";
import { serverModules } from "../modules.ts";
import { MODELS } from "../providers/llm.ts";

export interface Capability {
  /** The step's name on the admin page, with an explanation in full-width brackets if it needs one; alerts use the name alone. */
  label: string;
  env: string;
  default: string;
  /** Receipt purposes this capability produces (for the admin statistics). */
  purposes: string[];
  /** The step needs a model that reads images. */
  vision?: boolean;
  /** The step has nothing to do on this site, so a service's outage does not stop it. */
  idle?: () => boolean;
}

export const CAPABILITIES = {
  prefilter: { label: "Pré-triagem dos destaques (se pertence ao nicho; recall amplo)", env: "PREFILTER_MODEL", default: DEFAULTS.prefilter ?? "default", purposes: ["prefilter_article"] },
  score: { label: "Pontuação dos destaques (duas pontuações independentes, com limites por nível de fonte e categoria)", env: "SCORE_MODEL", default: DEFAULTS.score ?? "default", purposes: ["score_article"] },
  understand: { label: "Compreensão do conteúdo (título, resumo e motivo de recomendação dos selecionados e quase selecionados; olha a primeira imagem quando o modelo enxerga)", env: "UNDERSTAND_MODEL", default: DEFAULTS.understand ?? "default", purposes: ["understand_article"] },
  summarize: { label: "Título e resumo (título e resumo em português das demais matérias)", env: "SUMMARIZE_MODEL", default: DEFAULTS.summarize ?? "default", purposes: ["summarize_article"] },
  wording: { label: "Ajuste de termos (quando título, resumo ou motivo usam palavras que o site não usa, troca só essas palavras)", env: "WORDING_MODEL", default: DEFAULTS.wording ?? "default", purposes: ["mend_wording"], idle: () => !READER_WORDING.length },
  structure: { label: "Extração de estrutura (editoria, etiquetas, entidades, fatos do caso; não escreve texto para o leitor)", env: "STRUCTURE_MODEL", default: DEFAULTS.structure ?? "default", purposes: ["structure_article"] },
  group: { label: "Agrupamento de casos (relação da nova reportagem com fatos candidatos: mesmo acontecimento, desdobramento do mesmo caso, sem relação; se dois casos ligados pela mesma reportagem são o mesmo)", env: "GROUP_MODEL", default: DEFAULTS.group ?? "default", purposes: ["group_article", "group_signal", "group_story", "group_card"] },
  groupReview: { label: "Revisão do agrupamento (uniões de baixa similaridade e união de dois casos, relidas antes de gravar; o ideal é usar outro provedor)", env: "GROUP_REVIEW_MODEL", default: DEFAULTS.groupReview ?? "default", purposes: ["group_review", "group_story_review", "group_card_review"] },
  digest: { label: "Resumo do caso", env: "DIGEST_MODEL", default: DEFAULTS.digest ?? "default", purposes: ["story_digest"] },
  // Dailies are computed by rule; report_lead and report_daily remain for their older receipts.
  report: { label: "Panorama e temas do resumo semanal e do balanço mensal (o boletim sai por regras, sem modelo)", env: "REPORT_MODEL", default: DEFAULTS.report ?? "default", purposes: ["report_weekly", "report_monthly", "report_lead", "report_daily"] },
  translate: { label: "Tradução do texto integral dos destaques (inclui posts citados)", env: "TRANSLATE_MODEL", default: DEFAULTS.translate ?? "default", purposes: ["translate_body", "translate_quoted"] },
  feedback: { label: "Triagem de feedback (se o feedback do leitor tem conteúdo; o que não tem não é encaminhado)", env: "FEEDBACK_MODEL", default: DEFAULTS.feedback ?? "default", purposes: ["judge_feedback"] },
} satisfies Record<string, Capability>;

export type CapabilityKey = keyof typeof CAPABILITIES;

/** Every step: the engine's, then the installed modules' (their defaults also from site/models.ts). */
export function capabilities(): Record<string, Capability> {
  const all: Record<string, Capability> = { ...CAPABILITIES };
  for (const m of serverModules()) for (const [key, step] of Object.entries(m.models ?? {})) all[key] = { ...step, default: DEFAULTS[key] ?? "default" };
  return all;
}

/** Names of the active steps currently routed to a service, using the same choices as model calls. */
export async function stepsOnService(service: string, models?: ReadonlySet<string>): Promise<string[]> {
  const current = await modelSources();
  const steps = Object.entries(capabilities())
    .filter(([key, c]) => {
      if (c.idle?.()) return false;
      const primary = current[key]!.model;
      return [primary, fallbackModelFor(key, primary)].some(key => {
        const model = key && MODELS[key];
        return model && model.service === service && (!models || models.has(model.model));
      });
    })
    .map(([, c]) => c.label.split("（")[0]!);
  return [...new Set(steps)];
}

let cache: { at: number; switches: Record<string, string> } | null = null;

/** The name each admin switch holds, registered or not. */
async function switches(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.switches;
  const rows = await sql<{ key: string; value: { model?: string } }[]>`SELECT key, value FROM settings WHERE key LIKE 'models.%'`;
  const map: Record<string, string> = {};
  for (const r of rows) if (r.value?.model) map[r.key.slice("models.".length)] = r.value.model;
  cache = { at: Date.now(), switches: map };
  return map;
}

export function invalidateModelCache() {
  cache = null;
}

/** Whether a registered model explicitly declares image input support. Unspecified means text-only. */
export function modelSupportsVision(model: string): boolean {
  return MODELS[model]?.vision === true;
}

/** Whether a step can use a registered model. A model that reads images writes text as well. */
export function capabilityAcceptsModel(capability: Capability, model: { vision?: boolean }): boolean {
  return !capability.vision || model.vision === true;
}

/** The model a capability uses now: admin switch, else environment, else the code default. */
export async function modelFor(capability: CapabilityKey | (string & {})): Promise<string> {
  const c = capabilities()[capability];
  if (!c) throw new Error(`unknown model step: ${capability}`);
  const held = (await switches())[capability];
  const chosen = held && MODELS[held] ? held : process.env[c.env] ?? c.default;
  return MODELS[chosen] ? chosen : c.default;
}

/** Where the current choice comes from, for the admin page; `invalid` is an unregistered name passed over to reach it. */
export async function modelSources(): Promise<Record<string, { model: string; source: "admin" | "env" | "default"; invalid?: string }>> {
  const held = await switches();
  const out: Record<string, { model: string; source: "admin" | "env" | "default"; invalid?: string }> = {};
  for (const [key, c] of Object.entries(capabilities())) {
    const pick = held[key];
    const env = process.env[c.env];
    if (pick && MODELS[pick]) {
      out[key] = { model: pick, source: "admin" };
      continue;
    }
    const invalid = pick ?? (env && !MODELS[env] ? env : undefined);
    out[key] = { ...(env && MODELS[env] ? { model: env, source: "env" as const } : { model: c.default, source: "default" as const }), ...(invalid ? { invalid } : {}) };
  }
  return out;
}

export function fallbackModelFor(capability: string, primary: string): string | undefined {
  return Object.values(MODELS).find(model => model.fallbackFor?.[capability] === primary && model.service !== MODELS[primary]!.service)?.key;
}

/** Preserve an explicit primary choice; only the site's evaluated pair may fail over. */
export async function modelRoute(capability: CapabilityKey | (string & {})): Promise<{ model: string; fallbackModel?: string }> {
  const model = await modelFor(capability);
  return { model, fallbackModel: fallbackModelFor(capability, model) };
}
