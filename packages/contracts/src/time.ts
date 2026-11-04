// Site calendar helpers shared by web and backend.
// Destaques da Hora: Brasília time (America/Sao_Paulo, fixed UTC-3, no DST since 2019).
// The function names keep the upstream "beijing*" prefix so AIHOT updates still merge; read them as "site time".

/** The site's UTC offset as written in ISO 8601. */
export const SITE_UTC_OFFSET = "-03:00" as const;
const OFFSET_MS = -3 * 3600 * 1000;

/** YYYY-MM-DD of the instant in Beijing time. */
export function beijingDate(instant: Date | string | number): string {
  const d = new Date(new Date(instant).getTime() + OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** HH:mm of the instant in Beijing time. */
export function beijingTime(instant: Date | string | number): string {
  const d = new Date(new Date(instant).getTime() + OFFSET_MS);
  return d.toISOString().slice(11, 16);
}

/** The instant as ISO 8601 in Beijing time, to the millisecond: "2026-09-26T08:07:13.000+08:00". */
export function beijingIso(instant: Date | string | number): string {
  return `${new Date(new Date(instant).getTime() + OFFSET_MS).toISOString().slice(0, 23)}${SITE_UTC_OFFSET}`;
}

const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/**
 * "28 de set." of a calendar date (YYYY-MM-DD). Given `today` (YYYY-MM-DD, site time), a day of another year carries its
 * year, so an archived item is not read as this year's: "19 de fev. de 2019".
 */
export function monthDay(date: string, today?: string): string {
  const year = today && date.slice(0, 4) !== today.slice(0, 4) ? ` de ${date.slice(0, 4)}` : "";
  return `${Number(date.slice(8, 10))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}${year}`;
}

/** "29 de set." in site time. */
export const beijingDay = (instant: Date | string | number) => monthDay(beijingDate(instant));

/** "29 de set. 13:40" in site time. */
export const beijingStamp = (instant: Date | string | number) => `${beijingDay(instant)} ${beijingTime(instant)}`;

/** The zone's name, for whatever takes one (a scheduler, a report's metadata, SQL `AT TIME ZONE`). */
export const BEIJING_TIMEZONE = "America/Sao_Paulo" as const;

/** UTC instant of 00:00 Beijing on the given calendar day. */
export function beijingMidnight(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00${SITE_UTC_OFFSET}`));
}

/** UTC instant of an HH:mm Beijing time on the given calendar day. */
export function beijingAt(date: string, time: string): Date {
  return new Date(Date.parse(`${date}T${time}:00${SITE_UTC_OFFSET}`));
}

export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function beijingWeekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

/** ISO week label (e.g. 2026-W38) of a calendar date. */
export function isoWeekLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday..Sunday calendar dates of an ISO week label. */
export function isoWeekRange(label: string): { start: string; end: string } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(label);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  const startDate = start.toISOString().slice(0, 10);
  if (isoWeekLabel(startDate) !== label) return null;
  return { start: startDate, end: addDays(startDate, 6) };
}

/** First and last day (YYYY-MM-DD) of a calendar month label such as 2026-09; null for anything else. */
export function monthRange(label: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(label);
  if (!m) return null;
  const next = Number(m[2]) === 12 ? `${Number(m[1]) + 1}-01-01` : `${m[1]}-${String(Number(m[2]) + 1).padStart(2, "0")}-01`;
  return { start: `${label}-01`, end: addDays(next, -1) };
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === date;
}
