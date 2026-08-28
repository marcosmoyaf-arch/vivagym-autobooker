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

export function isBookingWindow(target, now = new Date()) {
  const p = madridParts(now);
  if (p.weekday !== target.weekday) return false;

  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const [hour, minute] = target.time.split(":").map(Number);
  const start = hour * 60 + minute;
  return minutes >= start && minutes <= start + 105;
}

export function nextWeekdayIso(weekday, now = new Date()) {
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const p = madridParts(now);
  const localDate = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const targetDay = weekdays[weekday];

  if (targetDay === undefined) {
    throw new Error(`Dia de la semana no valido: ${weekday}`);
  }

  let daysAhead = (targetDay - localDate.getUTCDay() + 7) % 7;
  if (daysAhead === 0) daysAhead = 7;
  localDate.setUTCDate(localDate.getUTCDate() + daysAhead);
  return localDate.toISOString().slice(0, 10);
}

export function shortSpanishDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

export function longSpanishDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
