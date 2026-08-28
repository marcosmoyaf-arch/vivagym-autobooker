import test from "node:test";
import assert from "node:assert/strict";
import {
  isBookingWindow,
  nextWeekdayIso,
  shortSpanishDate,
  longSpanishDate
} from "../src/schedule.mjs";

const vPower = { weekday: "Mon", time: "20:15" };
const virtualCycling = { weekday: "Fri", time: "15:30" };

test("calcula el lunes siguiente durante el horario de verano", () => {
  assert.equal(nextWeekdayIso("Mon", new Date("2026-08-31T18:16:00Z")), "2026-09-07");
});

test("calcula el viernes siguiente durante el horario de verano", () => {
  assert.equal(nextWeekdayIso("Fri", new Date("2026-08-28T13:31:00Z")), "2026-09-04");
});

test("calcula el viernes siguiente desde otro dia", () => {
  assert.equal(nextWeekdayIso("Fri", new Date("2026-08-31T18:16:00Z")), "2026-09-04");
});

test("acepta la ventana de V-Power a partir de las 20:15 de Madrid", () => {
  assert.equal(isBookingWindow(vPower, new Date("2026-08-31T18:15:00Z")), true);
  assert.equal(isBookingWindow(vPower, new Date("2026-08-31T18:14:00Z")), false);
});

test("acepta la ventana de Virtual Cycling a partir de las 15:30 de Madrid", () => {
  assert.equal(isBookingWindow(virtualCycling, new Date("2026-08-28T13:30:00Z")), true);
  assert.equal(isBookingWindow(virtualCycling, new Date("2026-08-28T13:29:00Z")), false);
});

test("adapta Virtual Cycling al horario de invierno", () => {
  assert.equal(isBookingWindow(virtualCycling, new Date("2026-12-04T14:30:00Z")), true);
});

test("rechaza otros dias", () => {
  assert.equal(isBookingWindow(vPower, new Date("2026-09-01T18:30:00Z")), false);
  assert.equal(isBookingWindow(virtualCycling, new Date("2026-09-03T13:30:00Z")), false);
});

test("formatea las fechas como puede mostrarlas VivaGym", () => {
  assert.equal(shortSpanishDate("2026-09-07"), "07/09/26");
  assert.equal(longSpanishDate("2026-09-07"), "07/09/2026");
});
