import { chromium } from "playwright";
import { isBookingWindow, nextMondayIso, shortSpanishDate } from "./schedule.mjs";

const LOGIN_URL = "https://www.vivagym.com/es-es/members/login/";
const BOOKINGS_URL = "https://www.vivagym.com/es-es/members/bookings/";
const TARGET_GYM = "Dos Hermanas";
const TARGET_CLASS = "V-Power";
const TARGET_TIME = "20:15";

const email = process.env.VIVAGYM_EMAIL;
const password = process.env.VIVAGYM_PASSWORD;
const runMode = process.env.RUN_MODE ?? "manual";
const dryRun = process.env.DRY_RUN === "true";

if (!email || !password) {
  throw new Error("Faltan los secretos VIVAGYM_EMAIL o VIVAGYM_PASSWORD.");
}

if (runMode === "schedule" && !isBookingWindow()) {
  console.log("Fuera de la ventana de reserva de los lunes 20:15-22:00 (Europe/Madrid).");
  process.exit(0);
}

const targetDate = nextMondayIso();
const targetShortDate = shortSpanishDate(targetDate);
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

async function isAlreadyBooked() {
  const mainText = await page.locator("main").innerText();

  return (
    mainText.includes(TARGET_CLASS) &&
    mainText.includes(`${targetShortDate} a las ${TARGET_TIME}`) &&
    mainText.includes(TARGET_GYM)
  );
}

async function selectGym() {
  const gymButton = page.getByRole("button", {
    name: "Gimnasio",
    exact: true
  });

  await gymButton.click();

  const search = page
    .locator('input[aria-label="Buscar gimnasio"]:visible')
    .first();

  await search.waitFor({ state: "visible" });
  await search.fill(TARGET_GYM);

  const target = page
    .locator(`input[type="checkbox"][aria-label="${TARGET_GYM}"]:visible`)
    .first();

  await target.waitFor({ state: "visible" });

  const selected = page.locator(
    'input[type="checkbox"]:checked:visible:not([id^="cky"])'
  );

  for (let i = (await selected.count()) - 1; i >= 0; i -= 1) {
    const option = selected.nth(i);

    if ((await option.getAttribute("aria-label")) !== TARGET_GYM) {
      await option.uncheck({ force: true });
    }
  }

  if (!(await target.isChecked())) {
    await target.check({ force: true });
  }

  await gymButton.click();
}

async function loadTargetDay() {
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

async function reserveTargetClass() {
  const card = page
    .locator(".bookings-calendar__item:visible")
    .filter({ hasText: TARGET_CLASS })
    .filter({ hasText: TARGET_TIME });

  if ((await card.count()) !== 1) {
    throw new Error(
      `No se encontro una unica clase ${TARGET_CLASS} a las ${TARGET_TIME} para ${targetDate}.`
    );
  }

  const cardText = await card.innerText();
  const capacity = cardText.match(/(\d+)\s+plazas disponibles/i);

  if (!capacity || Number(capacity[1]) < 1) {
    throw new Error(
      `La clase ${TARGET_CLASS} de las ${TARGET_TIME} no tiene plazas disponibles.`
    );
  }

  if (dryRun) {
    console.log(
      `[DRY RUN] Clase localizada: ${TARGET_CLASS}, ${targetDate} ${TARGET_TIME}, ${capacity[1]} plazas.`
    );
    return;
  }

  await card
    .getByRole("button", { name: `Reservar clase: ${TARGET_CLASS}` })
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

  if (!(await isAlreadyBooked())) {
    throw new Error(
      "VivaGym no mostro la reserva en Tus proximas clases."
    );
  }

  console.log(
    `Reserva confirmada: ${TARGET_CLASS}, ${TARGET_GYM}, ${targetDate} a las ${TARGET_TIME}.`
  );
}

try {
  await login();
  await openBookings();

  if (await isAlreadyBooked()) {
    console.log(
      `La clase ${TARGET_CLASS} del ${targetDate} a las ${TARGET_TIME} ya estaba reservada.`
    );
  } else {
    await selectGym();
    await loadTargetDay();
    await reserveTargetClass();
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
