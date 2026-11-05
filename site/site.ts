// Identidade do site e textos que o leitor vê. Destaques da Hora — Política, IA e Tecnologia.
// Web e backend leem este arquivo; depois de mudar, reconstrua (docker compose up --build).
// O domínio não fica aqui: use a variável de ambiente SITE_URL.

import type { Founder } from "@aihot/contracts/site-config";

/**
 * Horário das edições (Brasília, HH:mm): o diário cobre as 24 h anteriores; o semanal sai na segunda;
 * o mensal no dia 1º. O agendador verifica a cada meia hora: use hora cheia ou meia hora.
 */
export const EDITION_TIMES = { daily: "07:00", weekly: "09:00", monthly: "09:30" };

/** "todo dia às 07:00", "toda segunda às 09:00", "todo dia 1º às 09:30": o horário de cada edição dentro de uma frase. */
export const EDITION_WHEN = {
  daily: `todo dia às ${EDITION_TIMES.daily}`,
  weekly: `toda segunda às ${EDITION_TIMES.weekly}`,
  monthly: `todo dia 1º às ${EDITION_TIMES.monthly}`,
};

export const SITE = {
  /** Nome do site: navegação, títulos, imagens de compartilhamento, RSS, MCP, painel. */
  name: "Destaques da Hora",
  /** Termo do nicho, usado em algumas frases. */
  subject: "Política & IA",
  /** Título completo da página inicial (aba do navegador, buscadores). */
  homeTitle: "Destaques da Hora — Política, Inteligência Artificial e Tecnologia · Curadoria diária",
  /** Título da página de temas (/topics). */
  topicsTitle: "Temas: instituições, políticos, empresas de IA e tecnologia",
  feedbackExample: "Ex.: busquei por um termo e encontrei… eu esperava…",
  feedbackLead: "Encontrou um erro, quer um recurso ou algo te incomodou? Conta pra gente.",
  feedbackEmailHint: "Deixe seu e-mail se quiser resposta",
  /** Descrição curta: buscadores, cartões de compartilhamento, RSS, llms.txt. */
  description: `O portal do Rio de Janeiro: política, IA, tecnologia, Brasil, mundo, esportes e cinema, as notícias que importam, sem repetição, reunidas por fato, com boletim ${EDITION_WHEN.daily}.`,
  llmsIntro: "Portal brasileiro de curadoria automática: coleta fontes oficiais (Congresso, STF, TSE, governo do RJ) e veículos de política, IA e tecnologia, seleciona com IA o que é relevante, agrupa coberturas do mesmo fato e publica resumos com link para a fonte original." as string | null,
  tagline: "O Rio e o que importa: política, IA e tecnologia",
  keywords: ["notícias de política", "inteligência artificial", "IA na política", "tecnologia", "TSE", "Congresso", "boletim diário"] as string[],
  since: "2026" as string | null,
  locale: "pt-BR",
  defaultUrl: "http://localhost:3000",
  rootIcons: [] as string[],
  /** Prefixo das ferramentas MCP (destaques_get_latest…). Não mude depois que alguém integrar. */
  mcpPrefix: "destaques",
  interfaceVersion: "4.0.0",
  contactEmail: null as string | null,
  footerNote: "Construído sobre o framework open source AIHOT (MIT)",
  icp: null as string | null,
  psb: null as string | null,
  github: null as string | null,
  organization: {
    name: "Destaques da Hora",
    founder: null as Founder | null,
  },
  /** Nome do robô de coleta (User-Agent). */
  crawlerName: "DestaquesDaHoraBot/1.0",
} as const;

/** Páginas de termos de uso e privacidade (texto em pages/). */
export const POLICY = {
  terms: {
    name: "Termos de uso",
    description: "Termos de uso do site, RSS, API pública e MCP.",
    covers: null as string | null,
    notes: null as null | { rss: string; api: string },
    license: null as null | { llms: string; agent: string },
    headers: null as null | Record<string, string>,
  },
  privacy: {
    description: "Como o site trata dados locais do navegador, mensagens de contato e registros de acesso (LGPD).",
    covers: null as string | null,
  },
  /** Texto e imagens de um post do X contam como texto integral? */
  xPostIsFullText: true,
} as const;

/** Navegação (barra lateral, barra inferior no celular, página "Meu"). */
export const NAV = {
  hidden: [] as Array<"/hot" | "/topics">,
};

/** Rótulos nos cards e na página de cada notícia. */
export const ITEM_COPY = {
  /** Nome da frase que explica por que ler. */
  reasonLabel: "Por que importa",
  /** Leitores veem a nota da IA? A API e o painel continuam com a nota. */
  showScore: false,
};

interface ContactCard {
  kind: string;
  title: string;
  note: string;
  alias?: string;
}

/** Textos da página Sobre. Os números (fontes, notícias, edições) vêm das estatísticas do site. */
export const ABOUT = {
  kicker: `Sobre o ${SITE.name}`,
  description: `Sobre o ${SITE.name}: ${SITE.description}`,
  headline: ["Todo dia sai notícia demais.", "As que importam são poucas."] as [string, string],
  /** {sources} vira o número real de fontes (os espaços em volta são automáticos). */
  lead: `O ${SITE.name} acompanha{sources}fontes por você: coleta, agrupa, avalia e seleciona. O boletim sai ${EDITION_WHEN.daily}. Grátis e sem cadastro.`,
  sourcesFallback: "dezenas de",
  steps: {
    collect: "Fontes oficiais (Congresso, STF, TSE, governo), veículos de imprensa e especialistas. Quanto mais uma fonte publica, mais vezes ela é consultada, até a cada 15 minutos.",
    store: "Tudo é guardado, e as coberturas do mesmo fato são agrupadas num único evento. O ranking de destaques sai daí.",
    select: `A IA verifica se o assunto é do nosso nicho e se traz informação nova, depois escreve título, resumo e "${ITEM_COPY.reasonLabel}". Releases e republicações repetidas ficam de fora.`,
    publish: `Boletim diário ${EDITION_WHEN.daily}, resumo semanal ${EDITION_WHEN.weekly} e balanço mensal ${EDITION_WHEN.monthly}.`,
  },
  maker: null as null | {
    name: string;
    avatarSourceId?: string | null;
    greeting: string[];
    wechat?: ContactCard;
    feishu?: ContactCard;
  },
  copyright: [`O ${SITE.name} é um agregador de resumos e um índice de leitura; os direitos dos textos originais pertencem a cada fonte. Se você representa uma fonte e quer corrigir, remover ou ajustar a exibição, fale com a gente pela`, "página de contato."] as [string, string],
  termsAnchor: null as string | null,
} as const;

/** Avisos para o administrador no painel (opcional). */
export const ADMIN = {
  feedbackNote: null as string | null,
  banNote: null as string | null,
  budgetNote: null as string | null,
};

/** Exemplos da página de integração com agentes. */
export const AGENT = {
  search: { scope: "Busque por político, instituição, empresa, projeto de lei ou assunto nos últimos 7 dias", ask: "O que o TSE decidiu sobre IA nas eleições?" },
};

/** Textos das edições diária, semanal e mensal. */
export const REPORTS = {
  imprint: SITE.name.toUpperCase(),
  motto: SITE.subject as string,
  descriptions: {
    daily: `Boletim do ${SITE.name}, publicado ${EDITION_WHEN.daily} (horário de Brasília), com os principais fatos de política, IA e tecnologia`,
    weekly: "Resumo semanal de política, IA e tecnologia",
    monthly: "Balanço mensal de política, IA e tecnologia",
  },
  /** Como se chama cada item de uma edição ("4 destaques"). */
  entry: { measure: "", noun: "destaques" },
  metricUnits: { sourcesCount: "fontes", firstPartyEvents: "anúncios oficiais", selectedCount: "notícias selecionadas", reportsCovered: "boletins" },
  shareUnit: "destaques",
  quiet: { title: "Dia tranquilo: nenhum destaque novo", paragraph: "Entre {start} e {end} (horário de Brasília), não houve fatos novos relevantes." },
};

/** Alertas de operação (só para o administrador). */
export const ALERTS = {
  quietMinutes: 360,
  quietWhileFetchingMinutes: 720,
  usualFlow: null as string | null,
  workerLogs: "veja os logs do worker (docker compose logs worker)",
};

/** Padrões ao criar uma fonte no painel. */
export const SOURCE_DEFAULTS = {
  /** false: o site mostra só resumo e link para o original (recomendado por direito autoral). */
  siteFulltext: false,
};

export const COMMUNITY_FEEDS: { dev: string[]; hn: string[] } = {
  dev: [],
  hn: [],
};

/** Textos das imagens de compartilhamento de cada página. */
export const CARDS: Record<string, { kicker: string; title: string; subtitle: string; accent?: "hot" | "amber" }> = {
  site: { kicker: "Seleção do dia", title: SITE.tagline, subtitle: SITE.description },
  all: { kicker: "Todas as notícias", title: "As últimas de todas as fontes num só lugar", subtitle: "Tudo em ordem cronológica, com filtro por editoria e etiqueta." },
  hot: { kicker: "Em alta", title: "Do que todo mundo está falando nas últimas 48 horas", subtitle: "Índice de repercussão, tendência e as fontes que estão cobrindo.", accent: "hot" },
  daily: { kicker: "Boletim diário", title: `Todo dia às ${spokenTime(EDITION_TIMES.daily)}, um boletim que dá para ler inteiro`, subtitle: "O que importou nas últimas 24 horas." },
  weekly: { kicker: "Resumo semanal", title: "A semana inteira, numa leitura só", subtitle: "Os fatos principais, os anúncios e os debates que valem rever." },
  monthly: { kicker: "Balanço mensal", title: "O que mudou no mês", subtitle: "As linhas principais e os fatos-chave do mês." },
  about: { kicker: "Sobre", title: `Sobre o ${SITE.name}`, subtitle: SITE.description },
  terms: { kicker: "Termos de uso", title: `Termos de uso do ${SITE.name}`, subtitle: "Como usar o site, a API, o RSS e o MCP." },
  privacy: { kicker: "Privacidade", title: `Privacidade no ${SITE.name}`, subtitle: "Registros de acesso, dados locais do navegador e mensagens de contato." },
  changelog: { kicker: "Novidades", title: `Novidades do ${SITE.name}`, subtitle: "Recursos novos, melhorias, avisos e desativações." },
  feedback: { kicker: "Contato", title: "Diga onde podemos melhorar", subtitle: "Conteúdo, recursos, integrações ou pedidos de correção e remoção." },
  agent: { kicker: "Para agentes", title: `Conecte o ${SITE.name} ao seu agente de IA`, subtitle: "MCP, RSS e API: acesso anônimo, só leitura, sem chave." },
};

export const ACCESS = {
  ratePerMinute: null as number | null,
  userAgent: null as string | null,
};

export const DEPLOYMENT = {
  credentialsDir: null as string | null,
  credentialFiles: {} as Partial<Record<string, string>>,
  requiredSecrets: [] as const,
  originHost: null as string | null,
  loginReturnHeader: null as string | null,
  imageUpstreamBudget: null as null | { mbPerMinute: number; gbPerDay: number },
  directFetchHosts: [] as string[],
  selectionGold: null as null | { file: string; sample: number; split: string; sweep: [number, number] },
};

export const FEED_COPY = {
  allLeavesOut: [] as string[],
};

/** Editorias da API pública diferentes das do site (opcional). Não mude depois de publicar. */
export const PUBLIC_CATEGORIES = {
  merge: {},
  feedLabels: {},
} as const;

/**
 * Em chinês o framework cola o termo do nicho no substantivo ("AI resumo diário"). Em português isso não funciona,
 * então as duas funções só montam a frase: withSubject devolve o substantivo; subjectAfter junta texto e substantivo.
 */
export function withSubject(noun: string): string {
  return noun;
}

export function subjectAfter(text: string, noun?: string): string {
  return noun ? `${text} ${noun}`.replace(/\s+/g, " ").trim() : text;
}

/** "7h", "9h30": horário falado. */
function spokenTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return `${hour}h${minute ? String(minute).padStart(2, "0") : ""}`;
}
