// Shared admin vocabulary.
import { SELECTION } from "@aihot/industry/selection";

export const KIND_LABEL: Record<string, string> = { rss: "RSS", web_list: "Lista web", json_list: "JSON", x_search: "X", mp_account: "WeChat", external: "Envio externo" };
export const MODE_LABEL: Record<string, string> = { editorial: "Seleção", hot_signal: "Só repercussão", isolated: "Fora do site" };
export const HEALTH_LABEL: Record<string, string> = { ok: "Normal", degraded: "Instável", failing: "Falhando", paused: "Pausada", unknown: "Não verificada" };
export const VISIBILITY_LABEL: Record<string, string> = { public: "Pública", "summary-only": "Só resumo", withdrawn: "Retirada" };
export const FEEDBACK_STATUS: Record<string, string> = { new: "Nova", triaged: "Em análise", replied: "Respondida", resolved: "Resolvida", spam: "Spam" };
export const FEEDBACK_KIND: Record<string, string> = { bug: "Erro", suggestion: "Sugestão", question: "Dúvida", other: "Outro" };
export const TIER_LABEL: Record<string, string> = { T1: "T1", T1_5: "T1.5", T2: "T2", EXCLUDE_MP: "Excluir WeChat" };
/** The industry pack's source classes, each with the threshold floor it sets. */
export const SELECTION_CLASS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(SELECTION.classes).map(([k, c]) => [k, `${c.label} (limiar mínimo ${c.threshold})`]),
);
