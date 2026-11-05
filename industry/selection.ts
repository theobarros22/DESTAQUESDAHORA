// Limiares da Seleção. Os critérios de pontuação ficam em prompts/selection-score.md; aqui se decide apenas “quantos pontos bastam para entrar”.
// Cada material recebe duas notas independentes do modelo de pontuação (0–100); só vira candidato à Seleção se a soma for ≥ 2 × limiar;
// depois de confirmar a identidade da notícia e o valor novo, as regras de publicação decidem a exibição (veja docs/selection.md); o cartão mostra a média das duas notas.
// Os limiares variam conforme a classificação da fonte: fontes oficiais de primeira mão têm limiar menor; veículos e pessoas, maior; a categoria da fonte ainda eleva o limiar de algumas fontes oficiais.
// Ao mudar limiares ou o prompt de pontuação, rode scripts/eval-selection.ts de novo sobre amostras rotuladas por você antes de publicar (veja docs/selection.md).

export const SELECTION = {
  /**
   * Classificação da fonte → limiar de entrada (nota média). A classificação é definida para cada fonte em “Fontes”, na área administrativa:
   *   T1 oficial de primeira mão (site, blog oficial, instituições) · T1_5 contas oficiais, criadores quase oficiais · T2 veículos e pessoas
   * A classificação EXCLUDE_MP e as que não estão listadas aqui não entram na pontuação da Seleção (aparecem só em “Todas as atualizações”).
   */
  thresholds: { T1: 60, T1_5: 65, T2: 76 } as Record<string, number>,
  /**
   * Categoria da fonte → piso do limiar. A classificação só diz se a origem é oficial e de primeira mão; o conteúdo diário de algumas fontes oficiais é escrito sobretudo para desenvolvedores ou para o setor,
   * e o leitor só quer ver as grandes notícias: dê à fonte uma categoria em “Fontes” e o limiar sobe para, no mínimo, o valor daqui.
   * Só sobe, nunca desce: quem já tem limiar maior pela classificação (veículos) não é afetado. Fontes sem categoria seguem só a classificação.
   *   ecosystem ecossistema e infraestrutura: chips e hardware, inferência e nuvem, hospedagem de modelos, frameworks e ferramentas de desenvolvimento, empresas de pesquisa em segurança, blogs de engenharia e de desenvolvedores
   *   leaderboard rankings de avaliação: instituições que medem e ranqueiam o desempenho dos modelos
   */
  classes: {
    ecosystem: { label: "Ecossistema e infraestrutura", threshold: 70 },
    leaderboard: { label: "Rankings de avaliação", threshold: 76 },
  } as Record<string, { label: string; threshold: number }>,
  /**
   * Materiais que não entraram na Seleção, mas têm nota média acima deste valor, também são escritos no formato da Seleção (compreensão do conteúdo: título, resumo, motivo da indicação);
   * os demais usam a “tradução de título e resumo”, mais barata.
   */
  understandFloor: 50,
  /**
   * Navegar em “Todas as atualizações” (lista web, API e todos os modos do RSS) mostra só materiais com nota média não inferior a este valor; os sem nota continuam aparecendo;
   * a busca continua cobrindo tudo. Abaixo de 40 pontos estão sobretudo reproduções e contas de notícias em enxurrada (já chegaram a mais de um terço de Todas as atualizações); a Seleção nunca aceitou nada abaixo de 60.
   */
  browseFloor: 40,
} as const;
