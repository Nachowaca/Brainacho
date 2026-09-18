#!/usr/bin/env node
/**
 * Scraper de sorteos de "5 de Oro" y "Revancha" desde loteria.gub.uy.
 *
 * IMPORTANTE: este script NO fue probado contra la página real porque el
 * entorno donde se escribió tiene el acceso a internet bloqueado hacia
 * loteria.gub.uy (egress policy). El parseo está hecho por PATRONES
 * (fecha dd/mm/yyyy + 5 números de 2 dígitos en la misma fila de tabla)
 * en vez de por selectores CSS específicos, para ser más resistente a
 * cambios de markup — pero puede necesitar ajustes una vez corrido contra
 * el HTML real. Si falla, correr con DEBUG=1 para ver qué se encontró.
 *
 * Uso:
 *   node scripts/scrape-loteria.js --desde 2026-01-01 --hasta 2026-09-18
 *
 * Por defecto: desde el 1/1 del año en curso hasta hoy.
 */
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const BASE_URL = "https://loteria.gub.uy/ver_estadisticas.php";

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

function defaultRange() {
  const now = new Date();
  const desde = `${now.getFullYear()}-01-01`;
  const hasta = now.toISOString().slice(0, 10);
  return { desde, hasta };
}

/**
 * Busca en el HTML filas de tabla que contengan una fecha dd/mm/yyyy y
 * al menos 5 números de 2 dígitos (00-48, rango del 5 de Oro/Revancha).
 * Devuelve [{ fecha: 'yyyy-mm-dd', numeros: [n1..n5], juego: 'texto de contexto' }]
 */
function extraerSorteos(html) {
  const $ = cheerio.load(html);
  const sorteos = [];
  const fechaRe = /(\d{2})\/(\d{2})\/(\d{4})/;
  const numRe = /\b([0-4]?\d)\b/g;

  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((__, tr) => {
        const texto = $(tr).text().replace(/\s+/g, " ").trim();
        const fechaMatch = texto.match(fechaRe);
        if (!fechaMatch) return;

        const nums = [...texto.matchAll(numRe)]
          .map((m) => parseInt(m[1], 10))
          .filter((n) => n >= 0 && n <= 48);

        if (nums.length >= 5) {
          const [, dd, mm, yyyy] = fechaMatch;
          sorteos.push({
            fecha: `${yyyy}-${mm}-${dd}`,
            numeros: nums.slice(0, 5),
            contexto: texto.slice(0, 120),
          });
        }
      });
  });

  return sorteos;
}

async function fetchRango(desde, hasta) {
  const url = new URL(BASE_URL);
  // Nombres de parámetro son una suposición razonable (fecha_desde/fecha_hasta);
  // si el endpoint real usa otros nombres, ajustar acá.
  url.searchParams.set("fecha_desde", desde.split("-").reverse().join("/"));
  url.searchParams.set("fecha_hasta", hasta.split("-").reverse().join("/"));

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; 5DeOroIterador/1.0)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al pedir ${url}`);
  }

  return res.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { desde: desdeDefault, hasta: hastaDefault } = defaultRange();
  const desde = args.desde || desdeDefault;
  const hasta = args.hasta || hastaDefault;

  console.log(`Buscando sorteos entre ${desde} y ${hasta}...`);

  let html;
  try {
    html = await fetchRango(desde, hasta);
  } catch (err) {
    console.error("No se pudo acceder a loteria.gub.uy:", err.message);
    console.error(
      "Si esto corre en un entorno sin salida a internet, probalo en tu máquina o en un job de CI con acceso a la web."
    );
    process.exitCode = 1;
    return;
  }

  if (process.env.DEBUG) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(path.join(DATA_DIR, "_debug_raw.html"), html, "utf8");
    console.log("HTML crudo guardado en data/_debug_raw.html");
  }

  const sorteos = extraerSorteos(html);

  if (sorteos.length === 0) {
    console.warn(
      "No se encontraron sorteos con el patrón esperado. Corré con DEBUG=1 y revisá data/_debug_raw.html para ajustar el parser."
    );
  }

  await mkdir(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, "sorteos.json");
  await writeFile(
    outPath,
    JSON.stringify({ desde, hasta, generadoEn: new Date().toISOString(), sorteos }, null, 2),
    "utf8"
  );

  console.log(`Listo: ${sorteos.length} sorteos guardados en ${outPath}`);
}

main();
