import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/models";
import type { AdminModels } from "@aihot/contracts/admin";
import { SITE } from "@aihot/site";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money, num } from "../../features/admin/format";
import { AdminPage, Badge, Button, Card, DataTable, Empty, Field, FilterChips, ReasonDialog, Select } from "../../features/admin/ui";



export async function loader({ request }: Route.LoaderArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "7";
  return adminGet<AdminModels>(request, `/api/admin/models?days=${encodeURIComponent(days)}`);
}

export const meta: Route.MetaFunction = () => [{ title: `Modelos e avaliação · painel do ${SITE.name}` }];

const SOURCE_LABEL = { admin: "Trocado no painel", env: "Variável de ambiente", default: "Padrão do código" } as const;

/** A cost the provider did not report and no price covers. */
function Unpriced() {
  return <span className="whitespace-nowrap text-ink-4" title="O provedor não informou o custo; estime pelos tokens e pelo preço do seu modelo">Sem preço</span>;
}
const secs = (ms: number | null) => (ms == null ? "—" : ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);

export default function ModelsAdmin({ loaderData: m }: Route.ComponentProps) {
  const { run, pending } = useAdminAction();
  const [target, setTarget] = useState<AdminModels["capabilities"][number] | null>(null);
  const [choice, setChoice] = useState<string>("");
  const labelOf = (key: string) => m.capabilities.find((c) => `capability:${c.key}` === key)?.label ?? key;

  return (
    <AdminPage
      title="Modelos e avaliação"
      subtitle="Qual modelo cada etapa usa agora e de onde vem a escolha (painel > variável de ambiente > padrão do código), com taxa de sucesso, tempo e custo recentes. A troca vale só para tarefas novas; resultados antigos não são refeitos. Antes de trocar o modelo da seleção, compare no SelectBench com o mesmo lote."
      actions={<FilterChips param="days" options={[{ value: "1", label: "24 horas" }, { value: "", label: "7 dias" }, { value: "30", label: "30 dias" }]} />}
    >
      <div className="grid grid-cols-1 gap-5">
        {m.capabilities.map((c) => {
          const total = c.usage.reduce((a, u) => a + u.calls, 0);
          return (
            <Card
              key={c.key}
              title={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {c.label}
                  <span className="font-mono text-[12px] font-normal text-ink-3 [overflow-wrap:anywhere]">{c.current.model}</span>
                  <Badge tone={c.current.source === "admin" ? "accent" : "muted"}>{SOURCE_LABEL[c.current.source]}</Badge>
                  {c.current.invalid && <Badge tone="bad">{c.current.invalid} configurado não existe; não foi aplicado</Badge>}
                  {c.fallback && <span className="text-xs font-normal text-ink-3">
                    Reserva {c.fallback.model} · {c.fallback.primaryPaused
                      ? c.fallback.backupPaused ? "principal e reserva pausados, aguardando" : "assumindo no lugar do principal"
                      : c.fallback.backupPaused ? "indisponível por enquanto" : "pronto"}
                    {c.fallback.nextProbeAt && ` · a partir de ${bj(c.fallback.nextProbeAt)} o principal é testado de novo na próxima requisição`}
                  </span>}
                </span>
              }
              right={
                <Button
                  size="sm"
                  onClick={() => {
                    setTarget(c);
                    setChoice(c.current.model);
                  }}
                >
                  Trocar
                </Button>
              }
              pad={false}
            >
              {c.usage.length ? (
                <DataTable
                  dense
                  rows={c.usage}
                  rowKey={(u) => `${u.purpose}|${u.model}|${u.promptVersion}`}
                  columns={[
                    { key: "m", label: "Modelo", render: (u) => <span className="whitespace-nowrap font-mono text-[12px]">{u.model}</span> },
                    { key: "v", label: "Versão do prompt", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.promptVersion ?? "—"}</span> },
                    { key: "p", label: "Uso", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.purpose}</span> },
                    { key: "c", label: "Chamadas", align: "right", render: (u) => num(u.calls) },
                    {
                      key: "ok",
                      label: "Sucesso",
                      align: "right",
                      render: (u) => {
                        const rate = u.calls ? u.ok / u.calls : 0;
                        return <span className={rate < 0.95 ? "text-hot" : ""} title={`Falhas ${u.failed} · resultado desconhecido ${u.unknown}`}>{`${Math.round(rate * 1000) / 10}%`}</span>;
                      },
                    },
                    { key: "l", label: "Tempo p50 / p95", align: "right", render: (u) => <span className="whitespace-nowrap">{`${secs(u.p50)} / ${secs(u.p95)}`}</span> },
                    { key: "t", label: "Tokens entrada / saída", align: "right", render: (u) => <span className="whitespace-nowrap">{`${num(u.tokensIn)} / ${num(u.tokensOut)}`}</span> },
                    {
                      key: "$",
                      label: "Custo",
                      align: "right",
                      render: (u) =>
                        u.actualCost !== null ? (
                          `${money(u.actualCost)}${u.currency && u.currency !== "CNY" ? ` ${u.currency}` : ""}`
                        ) : u.estimate ? (
                          <span title="Estimado por uso × preço">≈ {money(u.estimate.amount)}{u.estimate.currency !== "CNY" ? ` ${u.estimate.currency}` : ""}</span>
                        ) : (
                          <Unpriced />
                        ),
                    },
                  ]}
                />
              ) : (
                <Empty>Nenhuma chamada em {m.days} dias{total === 0 && c.vision ? " (só é usado quando há imagens)" : ""}</Empty>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Histórico de trocas" pad={false}>
          {m.history.length ? (
            <DataTable
              dense
              rows={m.history}
              rowKey={(h) => `${h.at}|${h.subject}`}
              columns={[
                { key: "at", label: "Quando", render: (h) => <span className="num whitespace-nowrap">{bj(h.at)}</span> },
                { key: "c", label: "Etapa", render: (h) => labelOf(h.subject) },
                { key: "m", label: "Mudança", render: (h) => <span className="font-mono text-[12px]">{h.before?.model ?? "—"} → {h.after?.model ?? "—"}</span> },
                { key: "r", label: "Motivo", render: (h) => <span className="text-ink-3">{h.reason}</span> },
                { key: "a", label: "Quem", render: (h) => h.actor },
              ]}
            />
          ) : (
            <Empty>Nenhum modelo foi trocado pelo painel ainda</Empty>
          )}
        </Card>
        <Card title="Comparação com o mesmo lote (SelectBench)" right={<Link to="/admin/selectbench" className="text-accent">Todas as execuções</Link>} pad={false}>
          {m.benches.length ? (
            <DataTable
              dense
              rows={m.benches}
              rowKey={(b) => b.id}
              columns={[
                { key: "l", label: "Execução", render: (b) => <Link to={`/admin/selectbench/${b.id}`} className="text-ink hover:text-accent">{b.label}</Link> },
                { key: "m", label: "Modelos", render: (b) => <span className="font-mono text-[11.5px] text-ink-3">{b.models.join(", ")}</span> },
                { key: "n", label: "Amostras", align: "right", render: (b) => num(b.sample_size) },
                { key: "at", label: "Quando", render: (b) => <span className="num whitespace-nowrap">{bj(b.created_at)}</span> },
              ]}
            />
          ) : (
            <Empty>Nenhuma comparação importada ainda</Empty>
          )}
        </Card>
      </div>

      <ReasonDialog
        open={!!target}
        title={`Trocar modelo: ${target?.label ?? ""}`}
        description="Vale só para tarefas novas. “Voltar ao padrão” usa a variável de ambiente ou o padrão do código."
        confirmLabel="Trocar"
        busy={pending === "switch"}
        onClose={() => setTarget(null)}
        onSubmit={async (reason) =>
          (await run("POST", `/api/admin/models/${target!.key}`, { model: choice === "__default" ? null : choice, reason }, { label: "switch", success: "Trocado; vale a partir da próxima chamada" })) !== null
        }
      >
        <Field label="Modelo">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {m.choices
              .filter((x) => !target?.vision || x.vision)
              .map((x) => (
                <option key={x.key} value={x.key}>
                  {x.key} ({x.service})
                </option>
              ))}
            <option value="__default">Voltar ao padrão ({target?.env} ou {target?.defaultModel})</option>
          </Select>
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
