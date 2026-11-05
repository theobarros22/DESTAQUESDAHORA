import { Link, useLocation } from "react-router";
import { IntentLink } from "../ui/IntentLink";
import { SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { useChangelogDot } from "../../lib/changelog-dot";
import { mastheadNav, navIsActive } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";
import { Filings } from "./Filings";

const today = () => new Intl.DateTimeFormat(SITE.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());

/**
 * The desktop masthead (lg and up): a date strip with the appearance switch, the site name, and a dark
 * navigation band with every entry of the sidebar's former sections. Phones keep the tab bar. The band
 * scrolls sideways when the entries do not fit, so a narrow desktop or a long list of modules never wraps.
 */
export function Masthead({ changelogVersion }: { changelogVersion: string | null }) {
  const { pathname } = useLocation();
  const dot = useChangelogDot(changelogVersion);
  const sections = mastheadNav();
  return (
    <header className="hidden lg:block">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-8 max-w-[var(--page-max-wide)] items-center justify-between px-5 text-[12px] text-ink-3 wide:px-7">
          <span className="first-letter:uppercase" suppressHydrationWarning>{today()}</span>
          <ThemeSwitch />
        </div>
        <div className="mx-auto flex max-w-[var(--page-max-wide)] items-center px-5 py-4 text-ink wide:px-7">
          <Link to="/" aria-label={`${SITE.name}, página inicial`}>
            <Wordmark size={34} />
          </Link>
        </div>
      </div>
      <nav className="bg-masthead text-white" aria-label="Navegação principal">
        <div className="scrollbar-thin mx-auto flex max-w-[var(--page-max-wide)] items-stretch gap-0.5 overflow-x-auto px-3 wide:px-5">
          {sections.map((section, i) => (
            <div key={section.title} className={`flex shrink-0 items-stretch gap-0.5 ${i > 0 ? "ml-2 border-l border-white/20 pl-2" : ""}`}>
              {section.items.map((item) => {
                const on = navIsActive(item, pathname);
                return (
                  <IntentLink
                    key={item.to}
                    to={item.to}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex h-11 items-center whitespace-nowrap border-b-[3px] px-3 text-[13.5px] transition-colors touch:h-12 ${
                      on ? "border-masthead-hi font-bold text-white" : "border-transparent font-medium text-white/75 hover:text-white"
                    }`}
                  >
                    {item.label}
                    {dot && item.changelog && <span className="ml-1.5 size-1.5 rounded-full bg-masthead-hi" aria-label="Há novidades" />}
                  </IntentLink>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}

/** Desktop footer: what the sidebar's foot carried, the source link and the filing numbers. */
export function DesktopFooter() {
  if (!SITE.github && !SITE.psb && !SITE.icp) return null;
  return (
    <footer className="hidden border-t border-line py-5 lg:block">
      <div className="mx-auto flex max-w-[var(--page-max-wide)] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 text-[12px] text-ink-4 wide:px-7">
        {SITE.github && (
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-ink-3">
            Código aberto no GitHub
          </a>
        )}
        <Filings className="whitespace-nowrap hover:text-ink-3" badgeSize={10} />
      </div>
    </footer>
  );
}
