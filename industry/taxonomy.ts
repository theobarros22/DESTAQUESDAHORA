// Editorias, etiquetas, entidades (instituições e empresas) e o dicionário que impede a IA de atribuir
// um fato à instituição ou empresa errada. Destaques da Hora — Política, IA, Tecnologia, Brasil, Mundo, Esportes e Cinema.
// As chaves das editorias aparecem nas URLs (/all?category=…): depois de publicar, não mude.

/**
 * Editorias do site. section é o título da seção no boletim (várias editorias podem dividir uma seção);
 * guide diz ao modelo o que entra em cada editoria e onde fica a fronteira com as vizinhas.
 * commentary marca as editorias de comentário (dicas, análises).
 */
export const CATEGORIES = [
  { key: "politica", tagColor: "blue", label: "Política", feedLabel: "Política", section: "Política", guide: "Fatos do poder público brasileiro já ocorridos: Congresso (votações, projetos, CPIs), Executivo federal e do RJ, Alerj, partidos, alianças, nomeações, decisões do STF e de outros tribunais sobre política, orçamento e economia pública. Quando o assunto principal é eleição ou Justiça Eleitoral, vai para Eleições; quando é IA ou tecnologia no poder público, vai para IA & Política." },
  { key: "eleicoes", tagColor: "red", label: "Eleições", feedLabel: "Eleições", section: "Eleições", guide: "TSE e TREs (resoluções, julgamentos, cassações, registro de candidaturas), calendário eleitoral, campanhas, pesquisas eleitorais registradas, propaganda, financiamento e prestação de contas. Resolução do TSE sobre IA ou deepfake vai para IA & Política." },
  { key: "ia-politica", tagColor: "violet", label: "IA & Política", feedLabel: "IA & Política", section: "IA & Política", guide: "O cruzamento entre inteligência artificial e poder público: regulação de IA (PL 2338/2023 e outras), deepfakes e desinformação com IA, uso de IA em campanhas, regras do TSE sobre IA, IA no governo e na Justiça, ANPD e dados pessoais em sistemas de IA, regulação de plataformas quando envolve IA. É a editoria-núcleo do site." },
  { key: "ia", tagColor: "indigo", label: "Inteligência Artificial", feedLabel: "Inteligência Artificial", section: "Inteligência Artificial", guide: "Lançamentos e atualizações de modelos, produtos e ferramentas de IA, negócios das empresas de IA, pesquisas e estudos relevantes. Sem envolvimento do poder público. Tutorial de como usar uma ferramenta vai para Dicas." },
  { key: "tecnologia", tagColor: "turquoise", label: "Tecnologia", feedLabel: "Tecnologia", section: "Tecnologia", guide: "Big techs, redes sociais, celulares e hardware, telecom, internet, cibersegurança e vazamentos, governo digital (gov.br, Pix, serviços públicos digitais) e regulação de plataformas sem foco em IA." },
  { key: "brasil", tagColor: "orange", label: "Brasil", feedLabel: "Brasil", section: "Brasil", guide: "O que acontece no país fora da disputa política: cotidiano, economia (inflação, juros, emprego, preços), segurança pública, saúde, educação, meio ambiente, clima, cidades e o estado do Rio de Janeiro. Ato de governo, votação e decisão judicial vão para Política; eleição vai para Eleições; golpe digital e vazamento vão para Tecnologia ou Dicas." },
  { key: "mundo", tagColor: "wathet", label: "Mundo", feedLabel: "Mundo", section: "Mundo", guide: "Fatos internacionais: geopolítica, guerras e conflitos, eleições e governos de outros países, organismos como ONU e OMS, economia global, desastres e clima no exterior. Quando o fato afeta diretamente o Brasil, mantenha em Mundo e cite o impacto. Regulação de IA no exterior vai para IA & Política; empresa de tecnologia estrangeira vai para Tecnologia ou Inteligência Artificial." },
  { key: "esportes", tagColor: "lime", label: "Esportes", feedLabel: "Esportes", section: "Esportes", guide: "Resultados, decisões, transferências, convocações e bastidores do esporte: futebol (Brasileirão, Copa do Brasil, Libertadores, seleção, clubes do Rio), Olimpíadas, F1, vôlei, basquete, lutas e outros. Não é comentário: coluna e opinião esportiva vão para Análise. Negócios do esporte (direitos de transmissão, SAF) ficam em Esportes." },
  { key: "cinema", tagColor: "carmine", label: "Cinema e Séries", feedLabel: "Cinema e Séries", section: "Cinema e Séries", guide: "Cinema, séries, streaming e premiações: estreias, bilheteria, festivais, trailers, elenco e produção, cinema nacional. Resenha e crítica assinada vão para Análise; uso de IA na produção audiovisual vai para Inteligência Artificial." },
  { key: "dicas", tagColor: "green", label: "Dicas", feedLabel: "Dicas", section: "Dicas e Análises", guide: "Conteúdo prático que o leitor pode aplicar: como usar uma ferramenta de IA, prompts, configurações de privacidade e segurança, golpes digitais e como se proteger, produtividade. O foco é o passo a passo; lançar uma ferramenta é Inteligência Artificial ou Tecnologia.", commentary: true },
  { key: "analise", tagColor: "purple", label: "Análise", feedLabel: "Análise e Opinião", section: "Dicas e Análises", guide: "O centro é a interpretação, opinião, previsão, entrevista ou coluna de alguém. Fato novo noticiado por um político em rede social continua sendo notícia, não opinião; ser famoso não transforma o texto em análise.", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/** O tipo de publicação que o cabeçalho do boletim conta ("3 lançamentos de IA"). null desliga. */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "ia", tag: "Lançamento de IA", unit: "lançamentos de IA" };

/** Siglas e termos comuns que o resumo semanal/mensal pode escrever sem precisar achar na fonte (minúsculas). */
export const PLAIN_TERMS: readonly string[] = ["ia", "api", "stf", "stj", "tse", "tre", "pec", "pl", "cpi", "lgpd", "anpd", "pib", "ceo", "rj", "alerj", "gov.br", "pix"];

/** Tipo de conteúdo atribuído na etapa de compreensão (prompts/content-understanding.md). A nota usa pesos diferentes por tipo. */
export const ITEM_TYPES = ["official_act", "political_event", "election_event", "ai_release", "tech_news", "general_news", "research_data", "opinion_analysis", "practical_tip"] as const;

// ── Etiquetas ─────────────────────────────────────────────────────────────────────────

/** A primeira etiqueta de cada matéria tem de ser uma destas. A última é a de reserva. */
export const CATEGORY_TAGS = [
  "Ato oficial", "Votação/Legislativo", "Decisão judicial", "Eleições", "Regulação de IA", "Deepfake/Desinformação", "Lançamento de IA",
  "Produto/Atualização", "Pesquisa/Estudo", "Segurança digital", "Negócios/Mercado", "Cotidiano/Brasil", "Mundo/Geopolítica", "Esportes", "Cinema/Séries", "Dica/Tutorial", "Análise/Opinião", "Outros",
] as const;

/** Etiquetas de tema (opcionais). */
export const TOPIC_TAGS = [
  "Congresso", "Governo federal", "Governo do RJ", "Partidos", "Orçamento", "Pesquisa eleitoral", "Campanha", "Big techs", "Redes sociais",
  "IA generativa", "Agentes de IA", "Privacidade/LGPD", "Cibersegurança", "Golpes digitais", "Celulares/Hardware", "Governo digital",
] as const;

/** Etiquetas de entidade (instituições, empresas, plataformas). */
export const ENTITY_TAGS = ["STF", "TSE", "Câmara", "Senado", "Planalto", "Alerj", "ANPD", "OpenAI", "Google", "Meta", "Microsoft", "Anthropic"] as const;

/** Sinônimos que o modelo costuma usar → forma oficial da etiqueta. */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  lei: "Ato oficial", decreto: "Ato oficial", "medida provisória": "Ato oficial", portaria: "Ato oficial", "diário oficial": "Ato oficial", sanção: "Ato oficial",
  votação: "Votação/Legislativo", legislativo: "Votação/Legislativo", "projeto de lei": "Votação/Legislativo", pec: "Votação/Legislativo", cpi: "Votação/Legislativo",
  julgamento: "Decisão judicial", stf: "Decisão judicial", justiça: "Decisão judicial", tribunal: "Decisão judicial", decisão: "Decisão judicial",
  eleição: "Eleições", eleitoral: "Eleições", tse: "Eleições", candidatura: "Eleições",
  "regulação": "Regulação de IA", "regulamentação de ia": "Regulação de IA", "marco da ia": "Regulação de IA", "pl 2338": "Regulação de IA",
  deepfake: "Deepfake/Desinformação", desinformação: "Deepfake/Desinformação", "fake news": "Deepfake/Desinformação",
  lançamento: "Lançamento de IA", modelo: "Lançamento de IA", "novo modelo": "Lançamento de IA",
  produto: "Produto/Atualização", atualização: "Produto/Atualização", recurso: "Produto/Atualização",
  pesquisa: "Pesquisa/Estudo", estudo: "Pesquisa/Estudo", relatório: "Pesquisa/Estudo", dados: "Pesquisa/Estudo",
  segurança: "Segurança digital", vazamento: "Segurança digital", ataque: "Segurança digital", hacker: "Segurança digital",
  negócios: "Negócios/Mercado", mercado: "Negócios/Mercado", investimento: "Negócios/Mercado", aquisição: "Negócios/Mercado", empresa: "Negócios/Mercado",
  cotidiano: "Cotidiano/Brasil", brasil: "Cotidiano/Brasil", economia: "Cotidiano/Brasil", saúde: "Cotidiano/Brasil", "segurança pública": "Cotidiano/Brasil", educação: "Cotidiano/Brasil",
  mundo: "Mundo/Geopolítica", internacional: "Mundo/Geopolítica", geopolítica: "Mundo/Geopolítica", guerra: "Mundo/Geopolítica",
  esporte: "Esportes", esportes: "Esportes", futebol: "Esportes", jogo: "Esportes", campeonato: "Esportes",
  cinema: "Cinema/Séries", filme: "Cinema/Séries", série: "Cinema/Séries", streaming: "Cinema/Séries", estreia: "Cinema/Séries",
  dica: "Dica/Tutorial", tutorial: "Dica/Tutorial", "passo a passo": "Dica/Tutorial", "como fazer": "Dica/Tutorial",
  opinião: "Análise/Opinião", análise: "Análise/Opinião", coluna: "Análise/Opinião", entrevista: "Análise/Opinião",
  outro: "Outros", outros: "Outros",
  privacidade: "Privacidade/LGPD", lgpd: "Privacidade/LGPD", golpe: "Golpes digitais", golpes: "Golpes digitais",
};

// ── Instituições e empresas ───────────────────────────────────────────────────────────

/**
 * Entidades com página de tema: id → nome, etiqueta exibida no card (null = só agrupa), apelidos.
 * orgNames: nomes do órgão quando ele mesmo publica; otherNames: outros nomes (perfis, marcas).
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  stf: { name: "STF", displayTag: "STF", aliases: ["STF", "Supremo Tribunal Federal", "Supremo"], orgNames: ["Supremo Tribunal Federal", "STF"] },
  tse: { name: "TSE", displayTag: "TSE", aliases: ["TSE", "Tribunal Superior Eleitoral", "Justiça Eleitoral"], orgNames: ["Tribunal Superior Eleitoral", "TSE"] },
  camara: { name: "Câmara dos Deputados", displayTag: "Câmara", aliases: ["Câmara dos Deputados", "Câmara"], orgNames: ["Câmara dos Deputados", "Agência Câmara"] },
  senado: { name: "Senado Federal", displayTag: "Senado", aliases: ["Senado Federal", "Senado"], orgNames: ["Senado Federal", "Agência Senado"] },
  planalto: { name: "Governo federal / Planalto", displayTag: "Planalto", aliases: ["Planalto", "Palácio do Planalto", "Governo federal", "Presidência da República"], orgNames: ["Presidência da República", "Planalto"] },
  "governo-rj": { name: "Governo do RJ", displayTag: null, aliases: ["Governo do Rio de Janeiro", "Governo do Estado do Rio", "Governo do RJ"], orgNames: ["Governo do Estado do Rio de Janeiro"] },
  alerj: { name: "Alerj", displayTag: "Alerj", aliases: ["Alerj", "Assembleia Legislativa do Rio de Janeiro"], orgNames: ["Alerj"] },
  anpd: { name: "ANPD", displayTag: "ANPD", aliases: ["ANPD", "Autoridade Nacional de Proteção de Dados"], orgNames: ["ANPD"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "Sora", "Codex", "GPT"], orgNames: ["OpenAI"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], orgNames: ["Anthropic"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "YouTube"], orgNames: ["Google DeepMind", "Google", "DeepMind"] },
  meta: { name: "Meta", displayTag: "Meta", aliases: ["Meta", "Llama", "Facebook", "Instagram", "WhatsApp"], orgNames: ["Meta"] },
  microsoft: { name: "Microsoft", displayTag: "Microsoft", aliases: ["Microsoft", "Copilot"], orgNames: ["Microsoft"] },
  xai: { name: "xAI / X", displayTag: null, aliases: ["xAI", "Grok", "X (antigo Twitter)"], orgNames: ["xAI"] },
  nvidia: { name: "NVIDIA", displayTag: null, aliases: ["NVIDIA", "Nvidia"], orgNames: ["NVIDIA"] },
  apple: { name: "Apple", displayTag: null, aliases: ["Apple", "iPhone", "Apple Intelligence"], orgNames: ["Apple"] },
};

/**
 * Dicionário de identidade: se o título ou resumo citar uma destas entidades e o texto original não citar,
 * o sistema volta ao título original e descarta o resumo (evita atribuir o fato ao órgão ou empresa errada).
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "stf", name: "STF", patterns: [/\bSTF\b|Supremo Tribunal Federal/] },
  { id: "stj", name: "STJ", patterns: [/\bSTJ\b|Superior Tribunal de Justiça/] },
  { id: "tse", name: "TSE", patterns: [/\bTSE\b|Tribunal Superior Eleitoral/] },
  { id: "tcu", name: "TCU", patterns: [/\bTCU\b|Tribunal de Contas da União/] },
  { id: "pgr", name: "PGR", patterns: [/\bPGR\b|Procuradoria-Geral da República/] },
  { id: "pf", name: "Polícia Federal", patterns: [/\bPF\b|Polícia Federal/] },
  { id: "alerj", name: "Alerj", patterns: [/\bAlerj\b/i] },
  { id: "anpd", name: "ANPD", patterns: [/\bANPD\b/] },
  { id: "anatel", name: "Anatel", patterns: [/\bAnatel\b/i] },
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]|\bsora\b|\bcodex\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|deepmind|\bgemini\b|youtube/i] },
  { id: "meta", name: "Meta", patterns: [/\bMeta\b|\bllama\b|whatsapp|instagram|facebook/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot/i] },
  { id: "xai", name: "xAI / Grok", patterns: [/\bxai\b|\bgrok\b/i] },
  { id: "nvidia", name: "NVIDIA", patterns: [/nvidia/i] },
  { id: "apple", name: "Apple", patterns: [/\bapple\b|\biphone\b/i] },
  { id: "amazon", name: "Amazon / AWS", patterns: [/amazon|\baws\b/i] },
  { id: "deepseek", name: "DeepSeek", patterns: [/deepseek/i] },
  { id: "tiktok", name: "TikTok", patterns: [/tiktok|bytedance/i] },
  { id: "telegram", name: "Telegram", patterns: [/telegram/i] },
];

/** Artigos nestes domínios são publicados pela própria entidade. */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "stf", domains: ["stf.jus.br"] },
  { entityId: "tse", domains: ["tse.jus.br"] },
  { entityId: "camara", domains: ["camara.leg.br"] },
  { entityId: "senado", domains: ["senado.leg.br"] },
  { entityId: "alerj", domains: ["alerj.rj.gov.br"] },
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "blog.google"] },
  { entityId: "meta", domains: ["about.fb.com", "ai.meta.com"] },
  { entityId: "microsoft", domains: ["microsoft.com"] },
  { entityId: "nvidia", domains: ["nvidia.com"] },
];

/** Estas grafias no texto original também contam como menção à entidade. */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "stf", pattern: /\bSupremo\b/ },
  { entityId: "meta", pattern: /@AIatMeta\b/i },
];
