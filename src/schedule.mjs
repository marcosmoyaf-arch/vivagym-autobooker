export const TIME_ZONE = "Europe/Madrid";

export function madridParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function isBookingWindow(now = new Date()) {
  const p = madridParts(now);
  if (p.weekday !== "Mon") return false;

  const minutes = Number(p.hour) * 60 + Number(p.minute);
  return minutes >= 20 * 60 + 15 && minutes <= 22 * 60;
}

export function nextMondayIso(now = new Date()) {
  const p = madridParts(now);
  const localDate = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const weekday = localDate.getUTCDay();
  let daysAhead = (8 - weekday) % 7;
  if (daysAhead === 0) daysAhead = 7;
  localDate.setUTCDate(localDate.getUTCDate() + daysAhead);
  return localDate.toISOString().slice(0, 10);
}

export function shortSpanishDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}
