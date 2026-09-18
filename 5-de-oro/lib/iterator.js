/**
 * Iterador de sorteos y cálculo de frecuencia/"vencidos" (gap) por número.
 * Trabaja sobre el historial detallado sorteo-por-sorteo (data/sorteos.json),
 * no sobre agregados — así el gap es exacto desde el primer sorteo cargado.
 */

/**
 * Generador que recorre los sorteos ordenados por fecha, dentro de un rango opcional.
 * @param {Array<{fecha: string, numeros: number[]}>} sorteos
 * @param {{desde?: string, hasta?: string}} rango  fechas 'yyyy-mm-dd'
 */
export function* iterarSorteos(sorteos, { desde, hasta } = {}) {
  const ordenados = [...sorteos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const sorteo of ordenados) {
    if (desde && sorteo.fecha < desde) continue;
    if (hasta && sorteo.fecha > hasta) continue;
    yield sorteo;
  }
}

/**
 * Calcula, para cada número 00-48: veces que salió, fecha del último sorteo
 * visto y el gap (sorteos transcurridos desde esa última vez).
 * @param {Array<{fecha: string, numeros: number[]}>} sorteos
 */
export function calcularFrecuencias(sorteos, { desde, hasta } = {}) {
  const stats = new Map();
  for (let n = 0; n <= 48; n++) {
    stats.set(n, { numero: n, veces: 0, ultimaFecha: null, ultimoIndice: -1 });
  }

  let indice = 0;
  for (const sorteo of iterarSorteos(sorteos, { desde, hasta })) {
    for (const n of sorteo.numeros) {
      const s = stats.get(n);
      if (!s) continue;
      s.veces += 1;
      s.ultimaFecha = sorteo.fecha;
      s.ultimoIndice = indice;
    }
    indice += 1;
  }

  const totalSorteos = indice;
  for (const s of stats.values()) {
    s.gap = s.ultimoIndice === -1 ? totalSorteos : totalSorteos - 1 - s.ultimoIndice;
  }

  return { totalSorteos, numeros: [...stats.values()] };
}

/**
 * Score mixto: 50% frecuencia normalizada + 50% gap normalizado (mismo
 * criterio que el prototipo HTML). Devuelve el ranking completo, de mayor
 * a menor score.
 */
export function calcularCandidatos(sorteos, { desde, hasta } = {}) {
  const { numeros, totalSorteos } = calcularFrecuencias(sorteos, { desde, hasta });

  const maxVeces = Math.max(1, ...numeros.map((n) => n.veces));
  const maxGap = Math.max(1, ...numeros.map((n) => n.gap));

  const conScore = numeros.map((n) => ({
    ...n,
    score: 0.5 * (n.veces / maxVeces) + 0.5 * (n.gap / maxGap),
  }));

  conScore.sort((a, b) => b.score - a.score);
  return { totalSorteos, ranking: conScore };
}
