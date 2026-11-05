# Seleção e calibração

## Como um material vira seleção

1. **Entrada**: o mesmo endereço e o mesmo conteúdo ficam em uma só cópia. Quando um artigo comum só tem título ou resumo, o texto é buscado conforme as regras da fonte; páginas de reprodução de vídeo usam o material de texto já fornecido e não tratam a página do player como corpo. O material sem horário de publicação confiável não é publicado de imediato, e só se julga se é novo ou antigo depois de ler a data do original (veja “Regra: conteúdo antigo não inunda a tela” em [Fontes](sources.md#regra-conteúdo-antigo-não-inunda-a-tela)).
2. **Pré-filtro** (`prefilter.md`): isto é assunto do setor? Entrada ampla, só barra o claramente irrelevante: o material `BLOCK` não aparece em nenhuma página pública; `PASS` e os `UNKNOWN` (sem certeza) seguem adiante. Um artigo comum que só tem título, sem texto, resumo do feed nem texto de postagem, primeiro espera material, não é pontuado, não tem texto escrito a partir do título e não entra no conjunto público; depois que o material é completado e gera uma nova revisão, é julgado de novo. Postagens originais exibíveis com texto vazio ou só link seguem as regras de pontuação e exibição como estão.
3. **Pontuação** (`selection-score.md`): o mesmo critério de pontuação dá duas notas independentes (0–100). **Se a soma das duas ≥ 2 × limiar**, a nota é suficiente; o limiar varia pela classificação da fonte, e a classe da fonte ainda pode elevar o limiar de certas fontes oficiais; as que têm nota suficiente ainda passam pela deduplicação do passo 6 para entrar na seleção. A nota exibida nas páginas é a média das duas (arredondada para baixo).
4. **Estruturação** (`structure.md`): acontece ao mesmo tempo que a pontuação. Dá a categoria e as tags (é isto que as páginas exibem), as empresas-sujeito, e julga se o texto é uma notícia concreta, uma matéria de síntese sobre vários assuntos, ou se o material é insuficiente para dizer; se é uma notícia concreta, extrai os fatos (quem, fez o quê, a quê, quando), a fonte no original e as condições prévias. As páginas de tópicos, o agrupamento de eventos e o resumo diário dependem dele.
5. **Título e resumo**: só são escritos depois que a estruturação termina. Os selecionados e os que quase entraram (média acima de `understandFloor`) recebem título em português, resumo com a resposta primeiro e motivo da recomendação conforme `content-understanding.md`; os demais recebem título e resumo curtos conforme `summarize-*.md` e vão para “todas as atualizações”. Ao navegar em “todas as atualizações” (lista do site, interface, lista de últimas para Agentes, modo “todos” do MCP, RSS “todas as atualizações”), só saem materiais com média não inferior a `browseFloor`, e os ainda sem nota saem normalmente; com termo de busca, continua buscando em tudo. Quando uma postagem do X não tem texto ou só contém um link, mantém-se o link, as imagens e a citação da postagem original, sem chamar o modelo de redação ou de tradução e sem gerar um texto do tipo “complemente o texto”; artigos longos do X com texto real obtido são processados normalmente. Se o texto escrito usa palavras listadas em `industry/wording.ts`, pede-se ao modelo, uma única vez, que altere só essas palavras (`mend-wording.md`).
6. **Agrupamento e deduplicação** (`group-*.md`): as reportagens de fontes diferentes sobre a mesma coisa viram um evento, a página do evento tem uma síntese (`story-digest.md`), e “em alta” é ordenado por evento. Antes de mudar o prompt de síntese, dá para usar a [avaliação da síntese](story-digest-evaluation.md) para comparar lado a lado, no mesmo lote de eventos, o prompt atual e um candidato. O material com nota suficiente precisa esperar o agrupamento terminar para entrar na seleção: o modelo julga ao mesmo tempo se ele é a mesma notícia de uma reportagem já na seleção e se traz alguma informação concreta que a seleção ainda não deu.
   - Várias reportagens da mesma notícia podem todas ser selecionadas: no site elas se dobram em um grupo de leitura; a API, o RSS e a interface de sincronização dão uma entrada por notícia, apresentada pela reportagem representante: primeiro a de primeira mão oficial; depois a conta oficial verificada (conta `T1_5` com `publisherRole` e `owner_entity_id` preenchidos, em que o sujeito da notícia é essa empresa, a instituição antes da pessoa); e depois a que tem texto completo, nota alta e publicada mais cedo.
   - O que não é a mesma notícia mas não traz informação nova (explicar de outro jeito uma capacidade já divulgada, apenas disponibilizar em outra plataforma, um resumo que só repete os pontos já selecionados) não entra na seleção e fica em “todas as atualizações”. Uma matéria de síntese sobre vários assuntos não vira evento sozinha, só se prende aos eventos que cita, e entra na seleção só se tiver conteúdo importante que a seleção não cobriu; o material insuficiente, em que não se confirma de qual notícia se trata, não entra na seleção.
   - A reportagem expressamente retratada mantém o vínculo histórico, mas deixa de participar da recuperação de agrupamento seguinte, de candidatas a representante, do ponto de partida do evento e da comparação automática de eventos; o mesmo endereço e as respostas ou citações do X também não podem usá-la para dar base de identidade. Se o mesmo fato ainda tem reportagens válidas, usa-se a válida, e se todas foram retratadas, não se recupera por ora; depois de voltar a ser pública, pode participar de novo. Um registro que só exibe o resumo ou que ainda não foi publicado não equivale a retratado e mantém a qualificação original. As relações e julgamentos existentes não são apagados, e não se reagrupa em lote.
   - Antes da confirmação, o material fica só em “todas as atualizações” e, por mais que espere, não é liberado sozinho. Se a chamada ao modelo falha ou a resposta sai fora do formato, o material fica parado ali: esperar mais de 10 minutos gera alerta, a página “Execução” da administração lista esses materiais, e na “diagnóstico de conteúdo” é possível abrir o material e clicar em “reagrupar”. Por isso o modelo usado no agrupamento precisa responder de forma estável no formato.
7. **Resumo diário, semanal e mensal**:
   - O **resumo diário** sai todo dia às 08:00 (os horários de edição dos resumos diário, semanal e mensal estão em `EDITION_TIMES` de `site/site.ts`, e abaixo vão os valores padrão), cobrindo das 08:00 do dia anterior às 08:00 do dia, montado por regras, sem chamar modelos. Um item por assunto, tomando o texto mais autorizado da notícia com mais reportagens, e os outros desdobramentos do mesmo evento no dia ficam listados abaixo; uma matéria de síntese sobre vários assuntos fica sob o assunto mais importante que cita. O que já saiu nas últimas 7 edições não aparece de novo; num evento já noticiado que tem novo desdobramento, só entra no corpo se a própria parte envolvida teve nova ação (as categorias de `commentary`, como tutoriais e opiniões, não contam) ou se esse desdobramento foi noticiado por 4 ou mais fontes, e o resto vai para as notas rápidas. Um evento sem reportagem selecionada mas com publicação original oficial e com 3 ou mais participantes independentes também é acrescentado (só entra no resumo diário, não na seleção nem nos envios). A ordenação é por importância (a maior nota da reportagem selecionada, os participantes independentes que a discutiram no dia, se há publicação original oficial, com desconto para os desdobramentos), os 12 primeiros entram no corpo, no máximo 2 da mesma fonte, e depois disso há no máximo 10 notas rápidas de uma linha. O primeiro é a manchete, e a abertura é o próprio título e resumo dele; o 2º ao 4º são os destaques do dia.
   - O **resumo semanal** (toda segunda às 10:00) e o **resumo mensal** (todo dia 1º às 10:30) são compilados dos resumos diários da semana e do mês: o mesmo evento em vários dias conta uma vez, ordenado pela posição que o resumo diário lhe deu (manchete, destaque, quantos dias esteve), pela abrangência da cobertura e pela nota, com os 20 primeiros no semanal e os 30 primeiros no mensal, divididos em seções pelas seções do diário. O modelo (`report-period.md`, `report-period-sections.md`) só escreve a visão geral e uma frase de apresentação para as seções com três ou mais itens, sem acrescentar nem tirar itens; se ele escreve um nome ou número que não está nos itens (nomes em letras latinas, números de três ou mais dígitos ou com ponto decimal ou sinal de percentual, empresas da lista de termos), esse trecho não é usado: a visão geral vira uma frase gerada por modelo de texto, e as seções ficam sem apresentação. Os termos gerais do setor (`PLAIN_TERMS` de `taxonomy.ts`) e o nome do site não estão sujeitos a essa restrição.
   - Cada item da seleção entra em uma única edição: conta pelo horário dele e, para os que foram confirmados na seleção depois dele, pelo horário da confirmação; o que foi confirmado depois do corte entra na edição seguinte.
   - Verifica-se a cada meia hora: a edição que chegou na hora é gerada uma vez, e as que já saíram não são reescritas; as perdidas por parada e as que falharam são completadas nas verificações seguintes. Quando há materiais julgados no período do resumo diário mas nenhum evento novo, sai normalmente uma edição vazia; se nenhum material foi julgado, continua contando como falha, e a edição ausente alerta conforme a [documentação de implantação](deploy.md#atualização). Nos períodos dos resumos semanal e mensal, quando os resumos diários estão completos e todos os itens de texto original estão vazios, o período é ignorado automaticamente, sem escrever resumo semanal ou mensal vazio, sem chamar modelos e sem registrar como gerado ou falha; o primeiro período é verificado a partir do resumo diário mais antigo do site. Quando não há itens para reunir, se faltarem resumos diários ou se os itens existentes já não puderem ser publicados depois, o erro original é mantido. O ato de ignorar não grava marca permanente, e depois de corrigir o resumo diário dentro do alcance de reedição existente é possível gerar de novo.

O prompt de cada etapa está em `industry/prompts/`, e mudar prompts não exige mudar código. A versão do prompt é o hash do conteúdo dele: se você alterou um prompt, os materiais novos seguintes são julgados pela nova versão, e os já julgados não são recalculados.

## Limiares: `industry/selection.ts`

```ts
export const SELECTION = {
  thresholds: { T1: 60, T1_5: 65, T2: 76 },   // a média das duas pontuações precisa chegar pelo menos a este número
  classes: {                                  // classe da fonte: o limiar das fontes desta classe não fica abaixo do número daqui
    ecosystem: { label: "Ecossistema e infraestrutura", threshold: 70 },
    leaderboard: { label: "Rankings de avaliação", threshold: 76 },
  },
  understandFloor: 50,                        // materiais não selecionados com média acima disto também são escritos como os selecionados
  browseFloor: 40,                            // navegar em “todas as atualizações” só mostra materiais com média não inferior a isto; a busca não tem restrição
};
```

As fontes oficiais de primeira mão (T1) têm limiar mais baixo, e mídia e pessoas (T2) mais alto: para o mesmo fato, o texto oficial original merece ser visto primeiro. As classificações sem limiar (`EXCLUDE_MP`) não participam da seleção.

A classificação só diz se a origem é oficial e de primeira mão. O conteúdo do dia a dia de algumas fontes oficiais é escrito principalmente para desenvolvedores ou para o setor (chips e serviços de nuvem, frameworks e ferramentas, rankings de avaliação…), e o leitor só quer ver as grandes novidades: na página “Fontes” da administração, escolha para elas uma classe, e o limiar sobe a pelo menos o número da classe. Só sobe, nunca desce, e quem já tem um limiar de classificação mais alto não é afetado; sem escolher classe, vale só a classificação. A chave da classe fica guardada na fonte e não deve ser renomeada depois de no ar, e uma classe renomeada perde o efeito sem aviso; as amostras de avaliação não trazem classe e usam o limiar da classificação.

Com `browseFloor` em `0`, fica como antes, e “todas as atualizações” lista todos os materiais públicos.

Esses números são os limiares que o AIHOT sempre usou na área de IA, mais rígidos: prefere-se selecionar menos a deixar o ruído entrar na seleção. Se mudou de setor ou alterou o critério de pontuação, recalibre sem falta pelo método abaixo.

## Calibração

### 1. Prepare o conjunto de amostras

Escolha de 100 a 200 materiais das suas próprias fontes, marque um a um “deve selecionar / não deve” e guarde em `.data/gold.jsonl` (`.data/` não vai para o Git). Uma por linha:

```json
{"caseId":"law-001","material":{"title":"Título do original","originalTitle":null,"publishedAt":"2026-10-01T09:00:00+08:00","sourceName":"Nome da fonte","bodyZh":null,"bodyOriginal":"Texto…"},"sourceFacts":{"sourceKind":"rss","sourceTier":"T1","firstParty":true,"language":"pt"},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"regulation"},"gold":{"decision":"select"}}
```

| Campo | Explicação |
|---|---|
| `caseId` | Número único |
| `material` | Título, título original, horário de publicação, nome da fonte, texto (o texto em português vai em `bodyZh`, e o original em `bodyOriginal`; basta um) |
| `sourceFacts` | Tipo da fonte, classificação, se é de primeira mão (no ar, só `T1` conta como primeira mão; mantenha igual ao marcar) e idioma. A classificação decide qual limiar usar |
| `samplingContext` | Opcional. `benchmarkSplit` separa o conjunto de desenvolvimento do conjunto reservado, e `samplingStratum` é o seu próprio agrupamento (por exemplo “nova norma”, “decisão judicial”, “marketing”), para ver em que classe erra |
| `gold.decision` | `select` deve selecionar, `reject` não deve, `either` tanto faz (não conta na acurácia) |

O `industry/gold.example.jsonl` traz dois exemplos.

Algumas sugestões:

- Coloque muitos **casos difíceis**: os que quase deveriam ser selecionados e os que quase não deveriam. Se houver demais os que se decidem à primeira vista, a acurácia fica inflada.
- Separe uma parte como **conjunto reservado** (`benchmarkSplit: "holdout"`); ao ajustar prompts, olhe só o conjunto de desenvolvimento, e só no fim confira com o reservado, para não ajustar o prompt a ponto de só saber resolver estas questões.
- Quem marca deve ser, de preferência, quem vai ler este site depois, ou alguém com gosto parecido.
- A avaliação só roda o pré-filtro e as duas pontuações, sem a deduplicação do passo 6: marque pelo critério de o material em si dever ou não ser selecionado, sem marcar “não deve” só porque o mesmo fato já teve outro texto selecionado.

### 2. Rode a avaliação

```bash
node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl --split development --label "primeira versão do critério"
```

Para cada amostra, roda o pré-filtro e as duas pontuações, e dá:

- **Acurácia de saída válida, precisão, recall e F1**: olha só as amostras não `either` em que se obteve com sucesso a decisão de seleção, para julgar quão preciso é o modelo depois que ele responde;
- **Cobertura**: a proporção das amostras com decisão de seleção obtida com sucesso entre todas as amostras de referência não `either`; a **acurácia completa** usa como denominador todas as amostras de referência não `either`, contando como não concluídos corretamente também os casos em que o modelo falha ou responde fora do formato;
- `either` nunca entra no denominador das métricas de qualidade acima; o relatório registra à parte o número de falhas de amostras com decisão e o de falhas de `either`. `goldSelectRate` é calculado sobre todas as referências não `either`, por isso deve se manter igual para o mesmo lote de amostras entre modelos;
- Limiares de 40 a 90 a cada 2 pontos (o intervalo pode ser alterado em `DEPLOYMENT.selectionGold`, descrito abaixo), com o resultado que cada um daria; a varredura de limiares também relata ao mesmo tempo a acurácia de saída válida, a cobertura e a acurácia completa;
- Os itens que errou: o relatório completo é escrito em `.data/eval/` e também importado para o SelectBench da administração (com `--no-import`, não importa).

Sem passar `--models`, a avaliação usa o modelo que está sendo usado no ar na etapa “pontuação da seleção”: primeiro o trocado na página “Modelos e avaliação” da administração, depois a variável de ambiente `SCORE_MODEL`, depois o `DEFAULTS.score` de `site/models.ts`, e se não houver nenhum, o modelo padrão (`LLM_*` no `.env`). `--models default,deepseek-flash` permite comparar vários modelos no mesmo lote de amostras. Outros parâmetros comuns: `--n 200` quantos itens no máximo sortear, `--split holdout` roda só o conjunto reservado, `--no-import` não importa para o SelectBench. Se escrever em `DEPLOYMENT.selectionGold` de `site/site.ts` o arquivo de amostras, o número sorteado, qual parte sortear e o intervalo da varredura de limiares, depois, sem parâmetros, usa-se esse conjunto.

Numa mesma avaliação, quando amostras diferentes renderizam exatamente a mesma entrada de pontuação, só o resultado de pontuação do modelo é compartilhado, e cada amostra continua sendo contada de forma independente por seu próprio resultado de pré-filtro, limiar da classificação da fonte e marcação; os resultados com falha também são compartilhados nessa execução, de modo que a primeira execução e a repetição com resultados existentes cubram as mesmas amostras. Execuções repetidas reaproveitam os recibos existentes. O uso de tokens e o tempo médio no relatório são somados de todas as tentativas de requisição dos recibos relacionados, incluindo as repetições depois de falha de interpretação; ao repetir com resultados existentes, o que aparece é o uso acumulado desses recibos, e não representa o custo adicional desta vez.

### 3. Veja os erros, mude o critério, rode de novo

No SelectBench da administração, veja um a um os materiais julgados errado e as razões dadas pelo modelo:

Ao enviar relatórios de vários modelos, o mesmo `caseId` deve ter a mesma marcação `gold` em todos os modelos, e o `decision` do modelo pode ser diferente. Relatórios com marcações em conflito são recusados antes da gravação, para que, na comparação lado a lado, o mesmo material não apareça com respostas humanas diferentes; relatórios sem `cases` por exemplo ainda podem ser importados.

- Se um que devia ser selecionado não foi, provavelmente o critério de pontuação não deixou claro por que ele é importante: em `selection-score.md`, escreva esse tipo de valor na parte “deve ser avaliado normalmente”, com exemplos.
- Se um que não devia ser selecionado foi, provavelmente o ruído não foi contido: escreva na parte “deve ser contido”.
- Se no conjunto está solto ou apertado demais, e as notas dos itens errados ficam coladas ao limiar, então ajuste os limiares em `industry/selection.ts`.

Mude primeiro o critério, depois os limiares: o limiar só se move por inteiro, e não resolve “em que classe errou”. A cada mudança, rode de novo, e o SelectBench mostra a comparação de cada versão. Ao comparar modelos, não olhe só o F1 de saída válida: se a cobertura for bem diferente, olhe junto a acurácia completa; um modelo de nota alta que muitas vezes não consegue concluir o julgamento estruturado não deve ser “escondido” do denominador pelas amostras que falham.

## Trocar de modelo

A página “Modelos e avaliação” da administração mostra qual modelo cada etapa usa hoje, a taxa de sucesso recente, o tempo e o uso de tokens, e também permite trocar direto (só afeta as tarefas novas depois disso). Antes de trocar o modelo de pontuação, compare primeiro com `--models` no mesmo lote de amostras.
