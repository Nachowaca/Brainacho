import { test } from "node:test";
import assert from "node:assert/strict";
import { iterarSorteos, calcularFrecuencias, calcularCandidatos } from "../lib/iterator.js";

const sorteos = [
  { fecha: "2026-01-05", numeros: [4, 1, 7, 27, 6] },
  { fecha: "2026-01-01", numeros: [4, 24, 31, 20, 25] },
  { fecha: "2026-01-10", numeros: [4, 8, 22, 41, 43] },
];

test("iterarSorteos ordena por fecha ascendente", () => {
  const fechas = [...iterarSorteos(sorteos)].map((s) => s.fecha);
  assert.deepEqual(fechas, ["2026-01-01", "2026-01-05", "2026-01-10"]);
});

test("iterarSorteos respeta el rango desde/hasta", () => {
  const fechas = [...iterarSorteos(sorteos, { desde: "2026-01-02", hasta: "2026-01-05" })].map(
    (s) => s.fecha
  );
  assert.deepEqual(fechas, ["2026-01-05"]);
});

test("calcularFrecuencias cuenta veces y gap exacto por sorteo", () => {
  const { totalSorteos, numeros } = calcularFrecuencias(sorteos);
  assert.equal(totalSorteos, 3);

  const n4 = numeros.find((n) => n.numero === 4);
  assert.equal(n4.veces, 3);
  assert.equal(n4.ultimaFecha, "2026-01-10");
  assert.equal(n4.gap, 0); // salió en el último sorteo

  const n1 = numeros.find((n) => n.numero === 1);
  assert.equal(n1.veces, 1);
  assert.equal(n1.ultimaFecha, "2026-01-05");
  assert.equal(n1.gap, 1); // salió en el sorteo anterior al último

  const n2 = numeros.find((n) => n.numero === 2);
  assert.equal(n2.veces, 0);
  assert.equal(n2.gap, 3); // nunca salió: gap = total de sorteos
});

test("calcularCandidatos devuelve ranking ordenado por score descendente", () => {
  const { ranking } = calcularCandidatos(sorteos);
  for (let i = 1; i < ranking.length; i++) {
    assert.ok(ranking[i - 1].score >= ranking[i].score);
  }
});
