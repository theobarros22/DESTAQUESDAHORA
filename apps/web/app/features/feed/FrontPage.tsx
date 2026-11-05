// A primeira tela da home sem filtros, no modelo de jornal: manchete com foto, escolhas da redação, as últimas
// e o Rio agora. Só usa dados que a linha do tempo já traz; a foto aparece apenas quando a fonte tem licença
// (item.cover, com o crédito que a fonte pede), e sem ela a capa é tipográfica.
import { Link } from "react-router";
import type { FeedItemSummary, TimelineCard } from "@aihot/contracts/site";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { beijingTime } from "@aihot/contracts/time";
import { rememberPreview } from "../item/preview";

const CANDIDATES = 12;
const PICKS = 3;
const LATEST = 6;

/** A manchete é a mais bem pontuada entre as primeiras notícias; com pontuação igual, a que tem foto. */
export function pickLead(cards: TimelineCard[]): TimelineCard | null {
  const head = cards.slice(0, CANDIDATES);
  let lead: TimelineCard | null = null;
  for (const card of head) {
    const better = !lead || (card.item.score ?? 0) > (lead.item.score ?? 0) || ((card.item.score ?? 0) === (lead.item.score ?? 0) && !!card.item.cover && !lead.item.cover);
    if (better) lead = card;
  }
  return lead;
}

const label = (item: FeedItemSummary) => (item.category && CATEGORY_LABELS[item.category]) || item.source.name;

/** Foto licenciada com crédito, ou o bloco tipográfico em azul-marinho quando não há foto. */
function Cover({ item, big = false }: { item: FeedItemSummary; big?: boolean }) {
  const shape = big ? "aspect-[16/9]" : "aspect-[16/10]";
  // Sem foto, o bloco tipográfico é uma tarja baixa no celular, para não ocupar a tela com um retângulo vazio.
  const block = big ? "aspect-[16/7] sm:aspect-[16/9]" : "h-14 sm:aspect-[16/10] sm:h-auto";
  if (item.cover) {
    return (
      <figure className="m-0">
        <img src={item.cover.url} srcSet={item.cover.srcSet} sizes={big ? "(min-width: 1176px) 760px, 100vw" : "(min-width: 700px) 280px, 100vw"} alt="" loading={big ? "eager" : "lazy"} decoding="async" className={`${shape} w-full rounded-tile bg-bg-sunk object-cover`} />
        <figcaption className="mt-1 text-[11.5px] leading-snug text-ink-4">{item.cover.credit}</figcaption>
      </figure>
    );
  }
  return (
    <div className={`${block} flex w-full flex-col justify-end rounded-tile bg-masthead p-4 text-white`} aria-hidden="true">
      <span className="mb-2 h-1 w-10 bg-masthead-hi" />
      <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">{label(item)}</span>
    </div>
  );
}

function ItemLink({ item, className, children }: { item: FeedItemSummary; className?: string; children: React.ReactNode }) {
  return (
    <Link viewTransition to={`/items/${item.id}`} onClick={() => rememberPreview(item)} className={className}>
      {children}
    </Link>
  );
}

function Kicker({ item }: { item: FeedItemSummary }) {
  return (
    <p className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-masthead-hi">
      {label(item) !== item.source.name && <>{label(item)} · </>}
      <span className="font-medium normal-case tracking-normal text-ink-4">{item.source.name} · {beijingTime(item.timelineAt)}</span>
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 border-b-2 border-masthead pb-1 text-[13px] font-extrabold uppercase tracking-wider text-ink">{children}</h2>;
}

export function FrontPage({ cards, rio }: { cards: TimelineCard[]; rio: FeedItemSummary[] }) {
  const lead = pickLead(cards);
  if (!lead) return null;
  const rest = cards.filter((c) => c !== lead).map((c) => c.item);
  const picks = rest.slice(0, PICKS);
  const latest = rest.slice(PICKS, PICKS + LATEST);
  return (
    <section aria-label="Primeira página" className="mb-8 grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <ItemLink item={lead.item} className="group block">
          <Cover item={lead.item} big />
          <div className="mt-3">
            <Kicker item={lead.item} />
            <h2 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em] text-ink group-hover:text-accent lg:text-[32px]">{lead.item.title}</h2>
            {lead.item.summary && <p className="mt-2 line-clamp-3 text-[16px] leading-relaxed text-ink-2">{lead.item.summary}</p>}
          </div>
        </ItemLink>
        {picks.length > 0 && (
          <div className="mt-6">
            <SectionTitle>Escolhas da redação</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {picks.map((item) => (
                <ItemLink key={item.id} item={item} className="group block">
                  <Cover item={item} />
                  <div className="mt-2">
                    <Kicker item={item} />
                    <h3 className="line-clamp-4 text-[16px] font-bold leading-snug text-ink group-hover:text-accent">{item.title}</h3>
                  </div>
                </ItemLink>
              ))}
            </div>
          </div>
        )}
      </div>
      <aside className="min-w-0 space-y-6">
        {latest.length > 0 && (
          <div>
            <SectionTitle>As últimas</SectionTitle>
            <ol className="divide-y divide-line">
              {latest.map((item) => (
                <li key={item.id}>
                  <ItemLink item={item} className="group grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-2.5">
                    <span className="num pt-0.5 text-[12.5px] font-bold text-masthead-hi">{beijingTime(item.timelineAt)}</span>
                    <span className="line-clamp-3 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-accent">{item.title}</span>
                  </ItemLink>
                </li>
              ))}
            </ol>
          </div>
        )}
        {rio.length > 0 && (
          <div>
            <SectionTitle>Rio agora</SectionTitle>
            <ul className="divide-y divide-line">
              {rio.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <ItemLink item={item} className="group block py-2.5">
                    <span className="line-clamp-3 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-accent">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-4">{item.source.name} · {beijingTime(item.timelineAt)}</span>
                  </ItemLink>
                </li>
              ))}
            </ul>
            <Link to="/topics/rio-de-janeiro" className="mt-1 inline-block text-[12.5px] font-semibold text-accent hover:underline">
              Tudo do Rio
            </Link>
          </div>
        )}
      </aside>
    </section>
  );
}
