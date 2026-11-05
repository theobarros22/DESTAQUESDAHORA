# Pacote do setor

Todo o conhecimento do setor fica aqui: categorias, tópicos, fontes, critérios de seleção e limiares. Para trocar de setor, basta alterar esta pasta e [`site/`](../site/) (nome, textos, marca e páginas); os passos estão em [Adaptar para o seu setor](../docs/customize.md).

| Arquivo | Conteúdo |
|---|---|
| `taxonomy.ts` | Categorias, tags, empresas e instituições, vocabulário que impede o modelo de errar nomes de empresas e o tipo de lançamento mais acompanhado do setor (`RELEASE`) |
| `topics.json` | Catálogo de tópicos (`/topics`), lido na inicialização do site |
| `sources.json` | Fontes de exemplo importadas na primeira inicialização |
| `prompts/` | Prompts de cada etapa: pré-filtro, pontuação, redação, estruturação, agrupamento, resumo de eventos, resumos semanal e mensal, tradução |
| `selection.ts` | Limiares de entrada na Seleção |
| `gold.example.jsonl` | Exemplo do formato das amostras de avaliação da Seleção |
| `relation-gold.example.jsonl` | Exemplo do formato das amostras de avaliação de relação entre eventos |
| `story-digest-eval.example.jsonl` | Exemplo do formato dos casos de avaliação do resumo de eventos |
