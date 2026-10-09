'use strict';

// Convierte dBFS (nivel digital, siempre <= 0) a un "dB aproximado" del ambiente.
// El offset es una calibración: un micrófono de Mac sin calibrar NO es un sonómetro.
const DEFAULT_OFFSET_DB = 90;

function rmsToDbfs(rms) {
  return 20 * Math.log10(Math.max(rms, 1e-8));
}

function dbfsToDb(dbfs, offset = DEFAULT_OFFSET_DB) {
  return Math.max(0, dbfs + offset);
}

// Clases de ruido pensadas para trabajo de concentración.
function noiseClass(db) {
  if (db < 40) return 'silence';
  if (db < 55) return 'calm';
  if (db < 70) return 'moderate';
  return 'loud';
}

// Nivel equivalente (Leq): promedio en energía, no aritmético. Los picos pesan lo que deben.
function leq(dbs) {
  if (!dbs.length) return null;
  const mean = dbs.reduce((acc, db) => acc + Math.pow(10, db / 10), 0) / dbs.length;
  return 10 * Math.log10(mean);
}

// Heurística de "voz alrededor": qué parte de la energía cae en 300–3400 Hz.
// No reconoce habla de verdad (no hay ML): es un indicador, no un detector.
function voiceBandShare(freqDbBins, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  let voice = 0;
  let total = 0;
  for (let i = 1; i < freqDbBins.length; i++) {
    const hz = i * binHz;
    if (hz < 20 || hz > 8000) continue;
    const power = Math.pow(10, freqDbBins[i] / 10);
    total += power;
    if (hz >= 300 && hz <= 3400) voice += power;
  }
  return total > 0 ? voice / total : 0;
}

function looksLikeVoice(share, db) {
  return share >= 0.55 && db >= 40;
}

module.exports = { DEFAULT_OFFSET_DB, rmsToDbfs, dbfsToDb, noiseClass, leq, voiceBandShare, looksLikeVoice };
