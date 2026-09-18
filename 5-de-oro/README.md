# 5 de Oro — Iterador de sorteos

Scraper + iterador para armar el historial **sorteo por sorteo** (fecha + 5
números) de "5 de Oro" y "Revancha" desde `loteria.gub.uy`, para reemplazar
el agregado histórico del prototipo HTML por datos exactos día a día.

## ⚠️ Aviso importante

Este código se escribió en un entorno sandbox **sin salida a internet hacia
loteria.gub.uy** (egress bloqueado por política de red), así que el scraper
**no pudo probarse contra la página real**. El parser de `scrape-loteria.js`
busca patrones (fecha `dd/mm/yyyy` + 5 números de 2 dígitos en la misma fila
de tabla) en vez de depender de selectores CSS específicos, para ser lo más
resistente posible al markup real — pero puede necesitar ajustes.

**Para validarlo/ajustarlo:** correlo desde tu compu o un entorno con
internet, con `DEBUG=1` para guardar el HTML crudo:

```bash
cd 5-de-oro
npm install
DEBUG=1 node scripts/scrape-loteria.js --desde 2026-01-01 --hasta 2026-09-18
```

Si `data/sorteos.json` sale vacío, mirá `data/_debug_raw.html` para ver la
estructura real de la tabla y ajustar `extraerSorteos()` en
`scripts/scrape-loteria.js` (nombres de parámetros GET, formato de fecha,
selectores de tabla, etc.).

## Uso

```bash
npm install

# 1. Traer los sorteos (por defecto: 1/enero del año actual → hoy)
npm run scrape

# 2. Ver ranking de frecuencia/vencidos calculado sorteo por sorteo
npm run stats
```

Rango custom:

```bash
node scripts/scrape-loteria.js --desde 2026-01-01 --hasta 2026-09-18
node scripts/stats.js --desde 2026-01-01 --hasta 2026-09-18
```

## Qué resuelve esto del roadmap original

- ✅ Historial completo por sorteo (fecha + 5 números individuales), no solo
  agregado → el gap/"vencido" se calcula exacto desde el primer sorteo
  cargado (`lib/iterator.js`).
- ✅ Autoactualización desde la web oficial en vez de carga manual
  (`scripts/scrape-loteria.js`).
- ⏳ Pendiente (fuera de este alcance): persistencia en base de datos real y
  sync entre dispositivos — hoy el output es un JSON local
  (`data/sorteos.json`); conectarlo a una base es el siguiente paso natural
  una vez que el scraper esté validado contra la página real.

## Estructura

```
5-de-oro/
  scripts/
    scrape-loteria.js   # trae y parsea los sorteos → data/sorteos.json
    stats.js            # ranking de frecuencia/gap sobre data/sorteos.json
  lib/
    iterator.js         # iterarSorteos / calcularFrecuencias / calcularCandidatos
  test/
    iterator.test.js    # tests del iterador (no requieren red)
  data/
    sorteos.json        # (generado) historial sorteo por sorteo
```

## Test

```bash
npm test
```

## Recordatorio

Esto es un ejercicio estadístico/de entretenimiento. Ningún patrón predice
un sorteo real: cada sorteo es independiente.
