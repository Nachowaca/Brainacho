#!/usr/bin/env node
/**
 * Lee data/sorteos.json (generado por scrape-loteria.js) y muestra ranking
 * de frecuencia/gap y top 5 candidatos, igual que el prototipo HTML pero
 * calculado sorteo-por-sorteo.
 *
 * Uso:
 *   node scripts/stats.js --desde 2026-01-01 --hasta 2026-09-18
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calcularCandidatos } from "../lib/iterator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = path.join(__dirname, "..", "data", "sorteos.json");

  let raw;
  try {
    raw = JSON.parse(await readFile(dataPath, "utf8"));
  } catch {
    console.error(`No encontré ${dataPath}. Corré primero: npm run scrape`);
    process.exitCode = 1;
    return;
  }

  const { totalSorteos, ranking } = calcularCandidatos(raw.sorteos, {
    desde: args.desde,
    hasta: args.hasta,
  });

  console.log(`Sorteos analizados: ${totalSorteos}`);
  console.log("\nTop 5 candidatos (score = 50% frecuencia + 50% gap):");
  ranking.slice(0, 5).forEach((n, i) => {
    console.log(
      `${i + 1}. ${String(n.numero).padStart(2, "0")}  veces=${n.veces}  gap=${n.gap}  score=${n.score.toFixed(3)}`
    );
  });

  console.log("\nEsto es un ejercicio estadístico, no una predicción: cada sorteo es independiente.");
}

main();
