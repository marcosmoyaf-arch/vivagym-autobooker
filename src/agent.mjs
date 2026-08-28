import { chromium } from "playwright";
import {
  isBookingWindow,
  nextWeekdayIso,
  shortSpanishDate,
  longSpanishDate
} from "./schedule.mjs";

const LOGIN_URL = "https://www.vivagym.com/es-es/members/login/";
const BOOKINGS_URL = "https://www.vivagym.com/es-es/members/bookings/";

const TARGETS = [
  {
    gym: "Dos Hermanas",
    className: "V-Power",
    weekday: "Mon",
    weekdayName: "lunes",
    time: "20:15"
  },
  {
    gym: "Dos Hermanas",
    className: "Virtual Cycling",
    weekday: "Fri",
    weekdayName: "viernes",
    time: "15:30"
  }
];

const email = process.env.VIVAGYM_EMAIL;
const password = process.env.VIVAGYM_PASSWORD;
const runMode = process.env.RUN_MODE ?? "manual";
const dryRun = process.env.DRY_RUN === "true";

if (!email || !password) {
  throw new Error("Faltan los secretos VIVAGYM_EMAIL o VIVAGYM_PASSWORD.");
}

const activeTargets = runMode === "schedule"
  ? TARGETS.filter((target) => isBookingWindow(target))
  : TARGETS;

if (activeTargets.length === 0) {
  console.log("Fuera de las ventanas de reserva configuradas (Europe/Madrid).");
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: "es-ES",
  timezoneId: "Europe/Madrid"
});
const page = await context.newPage();

async function login() {
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });

  const acceptCookies = page
    .locator('[data-cky-tag="accept-button"], button.cky-btn-accept')
    .first();

  await acceptCookies
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(() => {});

  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click({ force: true });
  }

  const logout = page
    .locator('a[aria-label="Cerrar sesión"]:visible')
    .first();

  if (await logout.isVisible().catch(() => false)) return;

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await logout.waitFor({ state: "visible", timeout: 20_000 });
}

async function openBookings() {
  await page.goto(BOOKINGS_URL, { waitUntil: "domcontentloaded" });

  await page
    .getByRole("heading", { name: "Calendario de clases" })
    .waitFor({ state: "visible", timeout: 20_000 });
}

async function isAlreadyBooked(target, targetDate) {
  const mainText = await page.locator("main").innerText();
  const dateMatches = [shortSpanishDate(targetDate), longSpanishDate(targetDate)]
    .some((date) => mainText.includes(date));

  return (
    mainText.includes(target.className) &&
    mainText.includes(target.time) &&
    mainText.includes(target.gym) &&
    dateMatches
  );
}

async function selectGym(gym) {
  const gymButton = page.getByRole("button", {
    name: "Gimnasio",
    exact: true
  });

  await gymButton.click();

  const search = page
    .locator('input[aria-label="Buscar gimnasio"]:visible')
    .first();

  await search.waitFor({ state: "visible" });
  await search.fill(gym);

  const target = page
    .locator(`input[type="checkbox"][aria-label="${gym}"]:visible`)
    .first();

  await target.waitFor({ state: "visible" });

  const selected = page.locator(
    'input[type="checkbox"]:checked:visible:not([id^="cky"])'
  );

  for (let i = (await selected.count()) - 1; i >= 0; i -= 1) {
    const option = selected.nth(i);

    if ((await option.getAttribute("aria-label")) !== gym) {
      await option.uncheck({ force: true });
    }
  }

  if (!(await target.isChecked())) {
    await target.check({ force: true });
  }

  await gymButton.click();
}

async function loadTargetDay(targetDate) {
  const dayInput = page
    .locator('input[placeholder="Día"]:visible')
    .first();

  await dayInput.fill(targetDate);

  const filterButton = page
    .locator("button:visible")
    .filter({ hasText: /^Filtrar$/ })
    .first();

  await filterButton.click();

  await page
    .locator(".bookings-calendar__item:visible")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
}

async function reserveTargetClass(target, targetDate) {
  const card = page
    .locator(".bookings-calendar__item:visible")
    .filter({ hasText: target.className })
    .filter({ hasText: target.time });

  if ((await card.count()) !== 1) {
    throw new Error(
      `No se encontro una unica clase ${target.className} a las ${target.time} para ${targetDate}.`
    );
  }

  const cardText = await card.innerText();
  const capacity = cardText.match(/(\d+)\s+plazas disponibles/i);

  if (!capacity || Number(capacity[1]) < 1) {
    throw new Error(
      `La clase ${target.className} de las ${target.time} no tiene plazas disponibles.`
    );
  }

  if (dryRun) {
    console.log(
      `[DRY RUN] Clase localizada: ${target.className}, ${targetDate} ${target.time}, ${capacity[1]} plazas.`
    );
    return;
  }

  await card
    .getByRole("button", { name: `Reservar clase: ${target.className}` })
    .click();

  const dialog = page.getByRole("dialog");

  if (await dialog.isVisible().catch(() => false)) {
    const confirm = dialog
      .getByRole("button", { name: /confirmar|reservar/i })
      .last();

    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    }
  }

  await page.waitForTimeout(1_500);
  await openBookings();

  if (!(await isAlreadyBooked(target, targetDate))) {
    throw new Error(
      `VivaGym no mostro la reserva de ${target.className} en Tus proximas clases.`
    );
  }

  console.log(
    `Reserva confirmada: ${target.className}, ${target.gym}, ${targetDate} a las ${target.time}.`
  );
}

try {
  await login();
  await openBookings();

  for (const target of activeTargets) {
    const targetDate = nextWeekdayIso(target.weekday);

    if (await isAlreadyBooked(target, targetDate)) {
      console.log(
        `La clase ${target.className} del ${targetDate} a las ${target.time} ya estaba reservada.`
      );
      continue;
    }

    await selectGym(target.gym);
    await loadTargetDay(targetDate);
    await reserveTargetClass(target, targetDate);
    await openBookings();
  }
} catch (error) {
  console.error(`Página final: ${page.url()}`);
  console.error(
    `Título final: ${await page.title().catch(() => "No disponible")}`
  );
  throw error;
} finally {
  await browser.close();
}
