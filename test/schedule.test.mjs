import test from "node:test";
import assert from "node:assert/strict";
import { isBookingWindow, nextMondayIso, shortSpanishDate } from "../src/schedule.mjs";

test("calcula el lunes siguiente durante el horario de verano", () => {
  assert.equal(nextMondayIso(new Date("2026-08-31T18:16:00Z")), "2026-09-07");
});

test("calcula el lunes siguiente durante el horario de invierno", () => {
  assert.equal(nextMondayIso(new Date("2026-12-07T19:16:00Z")), "2026-12-14");
});

test("acepta la ventana del lunes a partir de las 20:15 de Madrid", () => {
  assert.equal(isBookingWindow(new Date("2026-08-31T18:15:00Z")), true);
  assert.equal(isBookingWindow(new Date("2026-08-31T18:14:00Z")), false);
});

test("rechaza otros dias", () => {
  assert.equal(isBookingWindow(new Date("2026-09-01T18:30:00Z")), false);
});

test("formatea la fecha como la muestra VivaGym", () => {
  assert.equal(shortSpanishDate("2026-09-07"), "07/09/26");
});
