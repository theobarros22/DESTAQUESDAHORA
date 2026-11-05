// Site navigation in one place: the desktop sidebar's sections and the phone tab bar's tabs, the engine's
// and the site's modules'.
import type { ReactNode } from "react";
import { NAV, subjectAfter, withSubject } from "@aihot/site";
import { webModules } from "../../site-modules";
import {
  IconBolt, IconBookmark, IconDoc, IconFlame, IconGrid, IconHeart, IconHistory, IconList, IconMessage, IconPlug, IconUser,
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  /** Match the path exactly (the home page). */
  end?: boolean;
  /** Shows the unread dot while the changelog has news. */
  changelog?: boolean;
}

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Conteúdo",
    items: [
      { to: "/", label: "Destaques", icon: IconBolt, end: true },
      { to: "/all", label: "Todas as notícias", icon: IconList },
      { to: "/hot", label: "Em alta", icon: IconFlame },
      { to: "/daily", label: "Boletim", icon: IconDoc },
      { to: "/topics", label: "Temas", icon: IconGrid },
      { to: "/starred", label: "Salvos", icon: IconBookmark },
    ],
  },
  {
    title: "Mais",
    items: [
      { to: "/agent", label: "Para agentes de IA", icon: IconPlug },
      { to: "/about", label: "Sobre", icon: IconHeart },
      { to: "/changelog", label: "Novidades", icon: IconHistory, changelog: true },
      { to: "/feedback", label: "Contato", icon: IconMessage },
    ],
  },
];

/** Whether an engine page is a way in from the navigation (site.ts NAV.hidden); a hidden page still opens. */
export const inNav = (to: string) => !(NAV.hidden as readonly string[]).includes(to);

const UP = {
  "/hot": { name: "Em alta", back: "Em alta", tab: "hot" },
  "/topics": { name: "Temas", back: "Todos os temas", tab: "me" },
} as const;

/**
 * Where pages under a navigation entry lead back up to: the entry, or Seleção in its place while the site hides
 * it. `name` is for breadcrumbs and desktop back links (Ranking de destaques), `back` for the phone bar (Destaques), `tab` the
 * phone tab it sits under, `crumbs` its breadcrumb after the site's home.
 */
export function navUp(entry: keyof typeof UP): { to: string; name: string; back: string; tab: TabKey; crumbs: Array<{ name: string; path: string }> } {
  if (!inNav(entry)) return { to: "/", name: "Destaques", back: "Destaques", tab: "featured", crumbs: [] };
  return { to: entry, ...UP[entry], crumbs: [{ name: UP[entry].name, path: entry }] };
}

/**
 * The sidebar: the engine's sections with the modules' between Conteúdo and Mais; a module naming a section
 * that is already there adds to it.
 */
export function sidebar(): Array<{ title: string; items: NavItem[] }> {
  const [content, ...rest] = SECTIONS;
  const more = rest.pop()!;
  const sections = [content!, ...rest].map((s) => ({ ...s, items: s.items.filter((i) => inNav(i.to)) }));
  for (const m of webModules()) {
    if (!m.sidebar) continue;
    const section = sections.find((s) => s.title === m.sidebar!.section);
    if (section) section.items.push(...m.sidebar.items);
    else sections.push({ title: m.sidebar.section, items: [...m.sidebar.items] });
  }
  return [...sections, more];
}

/** A sidebar entry is lit on its pages; resumo diário also covers weekly and monthly reports. */
export function sidebarIsActive(item: Pick<NavItem, "to" | "end">, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  if (item.to === "/daily") return /^\/(daily|weekly|monthly)(\/|$)/.test(pathname);
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/**
 * The phone tab bar: Todas lives beside Seleção as a switch, Destaques and resumo diário are tabs, and "Minha área" at /more holds
 * Favoritos, Aparência, the tools and the site's own pages. Which tab a page sits under is declared by the page
 * itself (components/shell/screens.ts).
 */
export type TabKey =
  | "featured"
  | "hot"
  | "daily"
  | "me"
  // A module's tab.
  | (string & {});

export interface Tab {
  key: TabKey;
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  changelog?: boolean;
}

const ENGINE_TABS: Tab[] = [
  { key: "featured", to: "/", label: "Destaques", icon: IconBolt },
  { key: "hot", to: "/hot", label: "Em alta", icon: IconFlame },
  { key: "daily", to: "/daily", label: "Boletim", icon: IconDoc },
  { key: "me", to: "/more", label: "Meu", icon: IconUser, changelog: true },
];

/** The tab bar: the engine's, the modules' before Minha área. */
export function tabs(): Tab[] {
  return [...ENGINE_TABS.slice(0, -1).filter((t) => inNav(t.to)), ...webModules().flatMap((m) => m.tabs ?? []), ENGINE_TABS.at(-1)!];
}

/**
 * The rail that stands in for the sidebar on narrow desktops (unfolded foldables, tablets upright): the
 * tabs, with Todas after Seleção since desktop pages have no Seleção | Todas switch.
 */
export function rail(): Tab[] {
  const all = tabs();
  if (!inNav("/all")) return all;
  const at = all.findIndex((t) => t.key === "featured") + 1;
  return [...all.slice(0, at), { key: "all", to: "/all", label: "Todas", icon: IconList }, ...all.slice(at)];
}

/** A rail entry is lit on its pages; Minha área also on the pages that sit under it on phones. */
export function railIsActive(tab: Tab, pathname: string, screenTab: TabKey | undefined): boolean {
  if (tab.key === "me") return pathname === tab.to || screenTab === "me";
  return sidebarIsActive({ to: tab.to, end: tab.to === "/" }, pathname);
}
