'use strict';

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const lerp = (x, x0, x1, y0, y1) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);

// 0–100: cuánto ayuda el ruido a concentrarse.
function noiseScore(db) {
  if (db <= 45) return 100;
  if (db <= 55) return lerp(db, 45, 55, 100, 80);
  if (db <= 70) return lerp(db, 55, 70, 80, 30);
  if (db <= 85) return lerp(db, 70, 85, 30, 0);
  return 0;
}

// 0–100: cuánto llevás sentado sin una pausa real.
function sitScore(sitMin) {
  if (sitMin <= 45) return 100;
  if (sitMin <= 90) return lerp(sitMin, 45, 90, 100, 40);
  if (sitMin <= 150) return lerp(sitMin, 90, 150, 40, 0);
  return 0;
}

// Ritmo circadiano genérico: pico a media mañana, bajón post-almuerzo, segundo pico a la tarde.
// Es un promedio poblacional; insights.js lo reemplaza con tus datos cuando hay historial.
function rhythmScore(hour) {
  const g = (h, mu, sigma) => Math.exp(-0.5 * Math.pow((h - mu) / sigma, 2));
  const base = hour >= 6 && hour < 23 ? 0.3 : 0.1;
  const v = base + 0.7 * g(hour, 10.5, 2) + 0.5 * g(hour, 17, 1.5);
  return clamp(v * 100);
}

function label(score) {
  if (score >= 75) return 'Modo flow';
  if (score >= 55) return 'Todo en orden';
  if (score >= 35) return 'Medio apagado';
  return 'Alerta roja';
}

// db puede ser null (micrófono sin permiso): se reparte el peso entre los otros dos.
function energyScore({ db, sitMin, hour }) {
  const parts = { sit: sitScore(sitMin), rhythm: rhythmScore(hour) };
  let total;
  if (db == null) {
    total = 0.58 * parts.sit + 0.42 * parts.rhythm;
  } else {
    parts.noise = noiseScore(db);
    total = 0.4 * parts.noise + 0.35 * parts.sit + 0.25 * parts.rhythm;
  }
  const score = Math.round(clamp(total));
  return { score, label: label(score), parts };
}

module.exports = { noiseScore, sitScore, rhythmScore, energyScore, label };
