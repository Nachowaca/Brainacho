'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const analysis = require('../src/core/analysis');
const { noiseScore, sitScore, rhythmScore, energyScore } = require('../src/core/score');
const { Session, emptyDay } = require('../src/core/session');
const { Coach } = require('../src/core/coach');
const { bestHours } = require('../src/core/insights');
const { Store } = require('../src/core/store');

const at = (h, m = 0, s = 0) => new Date(2026, 9, 9, h, m, s).getTime();

test('analysis: dB, clases y Leq', () => {
  assert.strictEqual(analysis.noiseClass(30), 'silence');
  assert.strictEqual(analysis.noiseClass(50), 'calm');
  assert.strictEqual(analysis.noiseClass(60), 'moderate');
  assert.strictEqual(analysis.noiseClass(75), 'loud');
  assert.ok(Math.abs(analysis.rmsToDbfs(0.1) - -20) < 1e-9);
  assert.strictEqual(analysis.dbfsToDb(-100, 90), 0);
  // Leq pesa los picos: 60 y 80 promedian ~77, no 70.
  const l = analysis.leq([60, 80]);
  assert.ok(l > 76.9 && l < 77.1, String(l));
  assert.strictEqual(analysis.leq([]), null);
});

test('analysis: banda de voz', () => {
  const sr = 48000;
  const fft = 2048;
  const bins = new Float32Array(fft / 2).fill(-120);
  const binHz = sr / fft;
  for (let i = 0; i < bins.length; i++) if (i * binHz >= 300 && i * binHz <= 3400) bins[i] = -40;
  assert.ok(analysis.voiceBandShare(bins, sr, fft) > 0.95);
  const low = new Float32Array(fft / 2).fill(-120);
  for (let i = 1; i < 5; i++) low[i] = -40; // solo grave (< 120 Hz)
  assert.ok(analysis.voiceBandShare(low, sr, fft) < 0.05);
  assert.ok(analysis.looksLikeVoice(0.7, 55));
  assert.ok(!analysis.looksLikeVoice(0.7, 20));
});

test('score: monotonía y límites', () => {
  assert.ok(noiseScore(40) > noiseScore(60) && noiseScore(60) > noiseScore(80));
  assert.ok(sitScore(20) > sitScore(70) && sitScore(70) > sitScore(120));
  assert.strictEqual(sitScore(200), 0);
  assert.ok(rhythmScore(10.5) > rhythmScore(15) && rhythmScore(17) > rhythmScore(15));
  assert.ok(rhythmScore(3) < 20);
  const good = energyScore({ db: 40, sitMin: 10, hour: 10.5 });
  const bad = energyScore({ db: 80, sitMin: 130, hour: 15 });
  assert.ok(good.score >= 75, JSON.stringify(good));
  assert.ok(bad.score < 35, JSON.stringify(bad));
  const nomic = energyScore({ db: null, sitMin: 10, hour: 10.5 });
  assert.ok(nomic.score > 0 && !('noise' in nomic.parts));
});

test('session: acumula actividad, ruido y pausas', () => {
  const s = new Session();
  let t = at(10);
  // 120 s activos, ruido calmo.
  for (let i = 0; i < 120; i++) s.tick((t += 1000), { db: 50, voice: false, idleSec: 0 });
  let { snapshot } = s.tick((t += 1000), { db: 50, idleSec: 0 });
  assert.ok(Math.abs(snapshot.sitMin - 2) < 0.1);
  assert.strictEqual(snapshot.noiseClass, 'calm');
  // 6 min inactivo => una pausa y reset de sitMin.
  for (let i = 0; i < 360; i++) snapshot = s.tick((t += 1000), { db: 45, idleSec: 60 + i }).snapshot;
  assert.strictEqual(snapshot.breaks, 1);
  assert.strictEqual(snapshot.sitMin, 0);
  // Vuelve: idle 0 => activo otra vez, sin romper el conteo.
  snapshot = s.tick((t += 1000), { db: 45, idleSec: 0 }).snapshot;
  assert.strictEqual(snapshot.breaks, 1);
  assert.ok(snapshot.sitMin > 0);
});

test('session: laguna larga (sleep) cuenta como pausa y no suma tiempo', () => {
  const s = new Session();
  let t = at(10);
  for (let i = 0; i < 30; i++) s.tick((t += 1000), { db: 50, idleSec: 0 });
  const before = s.day.seconds.total;
  const { snapshot } = s.tick((t += 20 * 60 * 1000), { db: 50, idleSec: 0 });
  assert.strictEqual(snapshot.breaks, 1);
  assert.strictEqual(s.day.seconds.total, before);
});

test('session: cambio de día devuelve el día anterior', () => {
  const s = new Session();
  s.tick(new Date(2026, 9, 9, 23, 59, 58).getTime(), { db: 50 });
  const { rolled, snapshot } = s.tick(new Date(2026, 9, 10, 0, 0, 1).getTime(), { db: 50 });
  assert.strictEqual(rolled.date, '2026-10-09');
  assert.strictEqual(snapshot.date, '2026-10-10');
});

test('session: sin micrófono (db null) no inventa ruido', () => {
  const s = new Session();
  let t = at(11);
  let snap;
  for (let i = 0; i < 10; i++) snap = s.tick((t += 1000), { db: null, idleSec: 0 }).snapshot;
  assert.strictEqual(snap.avgDb5, null);
  assert.strictEqual(snap.measuredMin, 0);
  assert.ok(snap.activeMin > 0);
});

test('coach: dispara, respeta cooldown y no más de un mensaje', () => {
  const coach = new Coach({ rng: () => 0 });
  const base = { sitMin: 65, avgDb5: 50, voiceShare5: 0, recentCount: 300, activeMin: 65, idleMin: 0, hour: 11 };
  const t0 = at(11);
  const first = coach.evaluate(t0, base);
  assert.strictEqual(first.id, 'sit60');
  assert.strictEqual(coach.evaluate(t0 + 5 * 60000, base), null);
  assert.strictEqual(coach.evaluate(t0 + 31 * 60000, base).id, 'sit60');
  const loud = coach.evaluate(t0, { ...base, sitMin: 5, avgDb5: 75 });
  assert.strictEqual(loud.id, 'loud');
  // Sin muestras suficientes no juzga el ruido.
  assert.strictEqual(new Coach().evaluate(t0, { ...base, sitMin: 5, avgDb5: 80, recentCount: 10 }), null);
});

test('insights: mejores horas solo con datos suficientes', () => {
  const mk = (activeByHour) => {
    const d = emptyDay('2026-10-01');
    for (const [h, pct] of Object.entries(activeByHour)) d.hourly[h] = { sec: 3600, active: 3600 * pct, dbSum: 0, dbN: 0 };
    return d;
  };
  assert.strictEqual(bestHours([mk({ 10: 1 })]).ready, false);
  const days = [mk({ 9: 0.5, 10: 0.9, 15: 0.3 }), mk({ 9: 0.6, 10: 0.95, 15: 0.2 }), mk({ 9: 0.55, 10: 0.85, 15: 0.4 })];
  const r = bestHours(days, { top: 2 });
  assert.ok(r.ready);
  assert.deepStrictEqual(r.hours.map((h) => h.hour), [10, 9]);
});

test('store: guarda y recupera días y ajustes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainacho-'));
  const store = new Store(dir);
  assert.strictEqual(store.loadDay('2026-10-09'), null);
  const day = emptyDay('2026-10-09');
  day.breaks = 3;
  store.saveDay(day);
  assert.strictEqual(store.loadDay('2026-10-09').breaks, 3);
  assert.strictEqual(store.listDays().length, 1);
  assert.deepStrictEqual(store.loadSettings(), { offsetDb: 90, notifications: true, micConsent: null });
  store.saveSettings({ offsetDb: 85, notifications: false });
  assert.strictEqual(store.loadSettings().offsetDb, 85);
  fs.rmSync(dir, { recursive: true });
});

const { SocialDetector, countSwings } = require('../src/core/social');

// Simula un ambiente: 60 s de oficina tranquila (40 dB) y luego la secuencia pedida.
function room() {
  const det = new SocialDetector({ rng: () => 0 });
  let t = at(10);
  const step = (db, voice = false, levels = []) => det.tick((t += 1000), { db, voice, levels });
  for (let i = 0; i < 70; i++) step(40);
  return { det, step };
}
const collect = (step, seq) => seq.flatMap(([db, voice, levels]) => step(db, voice, levels).events.map((e) => e.id));
const pulsing = [50, 62, 50, 62, 50, 62, 50, 62, 50, 62];

test('social: countSwings distingue risa (pulsos) de grito sostenido', () => {
  assert.ok(countSwings(pulsing) >= 3);
  assert.strictEqual(countSwings([70, 70, 71, 70, 70, 71, 70, 70, 70, 70]), 0);
});

test('social: no juzga durante el calentamiento', () => {
  const det = new SocialDetector();
  const r = det.tick(at(10), { db: 80, voice: true, levels: pulsing });
  assert.deepStrictEqual(r.events, []);
});

test('social: ráfaga corta pulsante => risa', () => {
  const { step } = room();
  const ids = collect(step, [[58, true, pulsing], [58, true, pulsing], [40], [40]]);
  assert.deepStrictEqual(ids, ['laugh']);
});

test('social: voz alta sostenida => discusión (una sola vez por cooldown)', () => {
  const { step } = room();
  const seq = Array.from({ length: 12 }, () => [72, true, [72, 73, 72, 72, 73, 72, 72, 73, 72, 72]]);
  const ids = collect(step, seq);
  assert.deepStrictEqual(ids, ['argument']);
});

test('social: remate seguido de silencio => silencio incómodo; con risa no', () => {
  const a = room();
  const flat = [58, 58, 58, 58, 58, 58, 58, 58, 58, 58];
  assert.deepStrictEqual(collect(a.step, [[58, true, flat], [58, true, flat], [40], [40], [40], [40], [40]]), ['awkward']);
  const b = room();
  const ids = collect(b.step, [[58, true, flat], [58, true, flat], [40], [60, false, pulsing], [60, false, pulsing], [40], [40], [40], [40], [40]]);
  assert.ok(!ids.includes('awkward'), ids.join());
});

test('social: voces fuertes durante un minuto => tensión, y el humor del mood sube', () => {
  const { det, step } = room();
  const seq = Array.from({ length: 60 }, () => [64, true, [64, 64, 64, 64, 64, 64, 64, 64, 64, 64]]);
  const ids = collect(step, seq);
  assert.ok(ids.includes('tension'), ids.join());
  assert.ok(det.mood().index >= 50, JSON.stringify(det.mood()));
});

test('social: sin micrófono resetea y no inventa eventos', () => {
  const { det } = room();
  assert.deepStrictEqual(det.tick(at(11), { db: null }).events, []);
});

test('session: recordEvent suma al contador del día', () => {
  const s = new Session();
  s.tick(at(9), { db: 40 });
  s.recordEvent('laugh');
  s.recordEvent('laugh');
  s.recordEvent('awkward');
  const { snapshot } = s.tick(at(9, 0, 1), { db: 40 });
  assert.deepStrictEqual(snapshot.social, { laughs: 2, awkward: 1, arguments: 0, tensions: 0 });
});
