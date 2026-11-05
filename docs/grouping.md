# Agrupamento de eventos e avaliação de relações

O site primeiro recupera, pelo título e pelo resumo, os fatos candidatos das duas últimas semanas (com serviço de vetores configurado, compara por vetores; sem ele, pela sobreposição de texto) e depois pede ao modelo que julgue a relação entre as reportagens e, ao mesmo tempo, se esta reportagem traz informação nova em relação ao que já está na seleção (a reportagem com nota suficiente depende deste julgamento para entrar na seleção, veja [Seleção e calibração](selection.md)). A definição das relações e os prompts que o site realmente usa estão em `industry/prompts/group-*.md`, e os pontos de entrada no código são `packages/backend/src/events/relate.ts` e `group.ts`.

As quatro relações são:

- `SAME_OCCURRENCE`: a mesma ocorrência real, por exemplo o texto oficial original e a reportagem da mídia sobre o mesmo lançamento.
- `SAME_STORY`: não é a mesma ocorrência, mas é um desdobramento direto do mesmo evento concreto, por exemplo a disponibilização, a avaliação ou a resposta depois de um lançamento.
- `UNRELATED`: assuntos diferentes, mesmo que o sujeito, o produto ou o tema sejam os mesmos.
- `ROUNDUP`: um dos lados é um resumo que contém vários temas.

## Avalie o julgamento de relação par a par com as suas próprias amostras marcadas

O `scripts/eval-relations.ts` avalia somente o julgamento do modelo sobre a relação entre duas reportagens. Ele reutiliza diretamente o `PAIR_SYSTEM`, o `pairUser()`, o `PairSchema` e a versão do prompt que o site usa no agrupamento, de modo que, se o prompt mudar, a avaliação muda junto. Ele não refaz a recuperação de candidatos nem grava o resultado de volta no agrupamento de eventos.

Coloque os seus dados marcados em `.data/` (esse diretório não é enviado ao Git). O `industry/relation-gold.example.jsonl` traz quatro exemplos fictícios. Uma por linha:

```json
{"caseId":"release-001","a":{"title":"...","source":"...","firstParty":true,"publishedAt":"2026-09-01T09:00:00+08:00","summary":"..."},"b":{"title":"...","source":"...","firstParty":false,"publishedAt":"2026-09-01T09:20:00+08:00","summary":"..."},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"same-release"},"gold":{"relation":"SAME_OCCURRENCE"}}
```

`a` e `b` também podem trazer um `frame` opcional, igual ao `ReportView` interno do site:

```json
{"subject":"Acme","action":"lançou","object":"Acme-2","occurredAt":"2026-09-01"}
```

Recomenda-se colocar no conjunto de desenvolvimento as amostras de fronteira fáceis de confundir e reservar uma parte com `benchmarkSplit: "holdout"` para a conferência final. `samplingStratum` é um rótulo de grupo opcional, usado para ver em que classe se erra, e não afeta a entrada do modelo.

### Execução

Primeiro configure o banco e os modelos do jeito normal de implantação e depois rode:

```bash
node --env-file=.env scripts/eval-relations.ts \
  --gold .data/relation-gold.jsonl \
  --split development
```

Por padrão usa o modelo atual da etapa “revisão do agrupamento”: primeiro o trocado na página “Modelos e avaliação” da administração, depois a variável de ambiente `GROUP_REVIEW_MODEL`, depois o `DEFAULTS.groupReview` de `site/models.ts`, e se não houver nenhum, o modelo padrão. Também é possível comparar explicitamente vários modelos configurados:

```bash
node --env-file=.env scripts/eval-relations.ts \
  --gold .data/relation-gold.jsonl \
  --models default,deepseek-flash \
  --split development \
  --n 200 \
  --seed 7 \
  --thresholds 0.75,0.8
```

Parâmetros disponíveis:

| Parâmetro | Padrão | Explicação |
|---|---:|---|
| `--gold` | `.data/relation-gold.jsonl` | Arquivo de amostras marcadas (JSONL) |
| `--models` | o modelo atual de “revisão do agrupamento” | Nomes de modelos separados por vírgula |
| `--split` | `all` | `development`, `holdout` ou um grupo definido por você |
| `--n` | `200` | Máximo de amostras avaliadas |
| `--seed` | `7` | Semente aleatória do sorteio; com a mesma semente, saem sempre as mesmas amostras |
| `--concurrency` | `6` | Número de requisições de modelo enviadas ao mesmo tempo |
| `--thresholds` | `STORY_REVIEW_MIN_CONFIDENCE,TIE_MIN_CONFIDENCE` de produção | Limiares de confiança usados ao julgar que duas reportagens “se ligam ao mesmo evento”; passar explicitamente sobrescreve o padrão |

O relatório completo é escrito em `.data/eval/relations-*.json`. Cada modelo recebe:

- Uma tabela de comparação 4 × 4: para cada relação marcada, qual relação o modelo julgou;
- Precisão, recall, F1 e número de amostras de cada relação (só contando as amostras com julgamento estruturado obtido com sucesso);
- `coverage`: a proporção das amostras com julgamento estruturado obtido com sucesso entre todas as amostras de referência;
- `accuracy` e o macro-F1 das quatro classes: medem apenas a qualidade do julgamento depois de obtido com sucesso o julgamento estruturado; já `completeAccuracy` usa todas as amostras de referência como denominador, contando como não concluídos corretamente também os casos de falha na chamada ou de resposta fora do formato;
- Contando `SAME_OCCURRENCE` e `SAME_STORY` como “se ligam ao mesmo evento”, a precisão, o recall e o F1 em cada limiar de confiança, junto com o `coverage` e o `completeAccuracy` do mesmo lote de amostras;
- O número de chamadas com erro, o uso de tokens, o tempo médio de cada requisição e o tempo total da avaliação inteira;
- O julgamento de cada amostra, a confiança, a nota de diferença escrita pelo modelo (`difference`) e o número do recibo.

As chamadas ao modelo passam como de costume pelo recibo e pelo disjuntor de orçamento. Avaliações repetidas com o mesmo modelo, prompt e entrada reaproveitam os recibos existentes; amostras com entrada idêntica na mesma execução compartilham o resultado de uma requisição, cada uma pontuando pela própria marcação, e as falhas também são compartilhadas, sem repetir a requisição nesta execução. O `reused` do relatório inclui os resultados compartilhados, de sucesso ou de falha, e os recibos de sucesso já existentes que foram reaproveitados. Os recibos da avaliação usam a finalidade própria `eval_relation_pair` e não entram nas estatísticas da administração das etapas de agrupamento do site.

O uso de tokens e o tempo médio são somados de todas as tentativas de requisição dos recibos citados pelo relatório, incluindo respostas anteriores que falharam na interpretação; um mesmo recibo não é contado duas vezes por várias amostras. Ao repetir com resultados existentes, esse uso histórico continua sendo exibido e não representa o custo adicional desta vez.

O CI verifica a interpretação do JSONL, o sorteio com semente fixa, cada métrica, e a reutilização concorrente e a contagem do uso em repetições com um servidor de modelo falso local, sem acessar nenhum serviço de modelo externo.
