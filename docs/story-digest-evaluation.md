# Avaliação do prompt de síntese de eventos

A síntese da página do evento é gerada por `industry/prompts/story-digest.md`. Antes de mudar este prompt, rode lado a lado, no mesmo lote de eventos, o prompt atual e um prompt candidato, e compare à mão, sem julgar pela impressão que a página causa.

## 1. Prepare os casos

```bash
node --env-file=.env scripts/eval-story-digests.ts --stories <id-do-evento>,<id-do-evento> --out .data/story-digest-cases.jsonl
```

O id do evento é o trecho do endereço da página do evento `/story/<id>`. A exportação só lê o banco, não chama modelos e não altera nenhum evento. As reportagens são escolhidas pelas mesmas regras com que o site gera a síntese, só que as apenas citadas de passagem, os textos de síntese, as retiradas e as ainda não públicas não contam. Os eventos que já têm síntese são montados como “reescrever depois de uma correção” (sem trazer a síntese da versão anterior), e os que ainda não têm, como primeira redação. Eventos não encontrados, já fundidos ou sem reportagens utilizáveis dão erro direto.

O arquivo exportado tem um evento por linha, e pode ser revisado antes. Para testar a atualização incremental quando há reportagens novas, mude `inputMode` para `incremental` e preencha `story.previousDigest` e `knownArticleIds` (os ids das reportagens que a versão anterior já continha). Também dá para escrever casos à mão, com o formato em `industry/story-digest-eval.example.jsonl` (exemplo fictício).

## 2. Comparação lado a lado

```bash
node --env-file=.env scripts/eval-story-digests.ts --cases .data/story-digest-cases.jsonl --system my-candidate.md
```

- Cada caso é executado uma vez com o prompt atual e uma vez com o candidato: o mesmo modelo (por padrão, o que a etapa “síntese de eventos” usa hoje, e `--models` pode indicar outro), a mesma entrada. O prompt de sistema, a entrada e os parâmetros de amostragem enviados ao modelo são exatamente os mesmos da geração da síntese no site.
- O arquivo candidato é escrito como em `industry/prompts/`: `{{siteName}}` vira o nome do site, `{{> nome do arquivo}}` insere as regras comuns, e valor ausente dá erro. Se o candidato e o prompt atual ficarem exatamente iguais depois de renderizados, recusa-se a execução. Sem passar `--system`, só roda o prompt atual.
- Antes de começar, imprime o número de chamadas (casos × modelos × prompts) e, se passar de `--max-calls` (padrão 18), não envia nenhuma. Cada chamada é registrada e entra no orçamento como as outras requisições de modelo do site; repetir sem mudanças reaproveita os resultados já recebidos, sem pagar de novo, então ao alterar uma versão candidata e rodar de novo, a metade do prompt atual não custa nada.

O resultado é escrito em `.data/eval/` (`--out-dir` muda), um JSON e um Markdown: o título e a síntese dos dois lados lado a lado, com o uso de tokens de cada chamada e o número do registro, e as chamadas que falharam têm o motivo escrito.

## 3. O que olhar à mão

Não há nota automática confiável, e esta ferramenta também não deixa um modelo dar nota a outro. Veja um a um:

- Se primeiro explica a mudança central e a conclusão atual, em vez de recontar por data a linha do tempo abaixo;
- Se há tom publicitário vazio e frases feitas;
- Se condições, públicos a que se aplica, cobrança e cotas, região e outras restrições continuam presos aos respectivos objetos;
- Se há conteúdo que não está nas reportagens nem nas evidências factuais, se comenta a própria reportagem (“a reportagem não divulgou…”) ou se leva requisitos de redação para dentro do texto;
- Ao reescrever depois de uma correção, se as afirmações antigas já inválidas foram eliminadas.

## 4. Depois de mudar o prompt

Trocar a versão do prompt, por si só, não reescreve a síntese dos eventos existentes. Um evento só é gerado de novo quando as reportagens dele mudam, e, havendo reportagens novas, reescreve-se de forma incremental tomando a síntese antiga como versão anterior, então o novo prompt passa a valer aos poucos com as reportagens novas, sem gerar de uma vez muitas chamadas de modelo.

Para que alguns eventos sejam reescritos de imediato com o novo prompt, chame `rewriteStoryDigest` na raiz do repositório (uma chamada de modelo por evento, registrada na auditoria da administração):

```bash
node --env-file=.env --input-type=module -e '
const { rewriteStoryDigest } = await import("@aihot/backend/events/corrections");
const { sql } = await import("@aihot/backend/db");
const [s] = await sql`SELECT id FROM stories WHERE public_id = ${"<id-do-evento>"}`;
if (!s) throw new Error("não existe este id de evento");
console.log(await rewriteStoryDigest(s.id, "prompt de síntese atualizado", "ops-script"));
await sql.end();'
```
