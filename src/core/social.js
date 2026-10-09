'use strict';

const { leq } = require('./analysis');

const WARMUP_SEC = 60; // antes de eso no hay línea de base: no se juzga nada
const HIST_SEC = 300;
const COOLDOWN_SEC = { laugh: 4, awkward: 60, argument: 120, tension: 300 };

const MESSAGES = {
  laugh: [
    'Risas detectadas: el equipo todavía tiene alma.',
    'Se escuchó una carcajada. Eso suma al clima, anotado.',
  ],
  awkward: [
    'Silencio incómodo: alguien tiró un chiste y el grupo respondió con un grillo.',
    'Posible chiste malo: cero risas, todo silencio. Respeto el intento.',
  ],
  argument: [
    'Voces altas sostenidas: parece discusión. Si no es imprescindible, ¿la pasamos a un café?',
    'Esto sube de tono. Respiren: ninguna pelea innecesaria vale tus pulsaciones.',
  ],
  tension: [
    'Clima tenso: mucha voz a buen volumen sin respiro. Cinco minutos de pausa le hacen bien a todos.',
  ],
};

const median = (arr) => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
};

// Cuántos "pulsos" (sube y baja) tiene el nivel dentro de un segundo. La risa pulsa; un grito sostenido no.
function countSwings(levels, minDelta = 4) {
  if (!levels || levels.length < 2) return 0;
  let swings = 0;
  let dir = 0;
  let ext = levels[0];
  for (let i = 1; i < levels.length; i++) {
    const v = levels[i];
    if (dir === 0) {
      if (v - ext >= minDelta) { dir = 1; ext = v; } else if (ext - v >= minDelta) { dir = -1; ext = v; }
    } else if (dir === 1) {
      if (v > ext) ext = v; else if (ext - v >= minDelta) { dir = -1; ext = v; swings++; }
    } else if (v < ext) ext = v; else if (v - ext >= minDelta) { dir = 1; ext = v; swings++; }
  }
  return swings;
}

function moodLabel(index) {
  if (index < 25) return 'Calma';
  if (index < 50) return 'Charla animada';
  if (index < 75) return 'Clima tenso';
  return 'Zona caliente';
}

// Detecta el clima del grupo SOLO a partir de cómo suena (volumen, ritmo, voces). No entiende palabras:
// son heurísticas estimadas, pensadas para dar una pista, no para juzgar a nadie.
class SocialDetector {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.hist = [];
    this.run = { len: 0, swings: 0, voice: 0 };
    this.hot = 0;
    this.pending = null;
    this.lastFired = new Map();
  }

  baseline() {
    return median(this.hist.map((h) => h.db));
  }

  mood() {
    if (this.hist.length < 10) return { index: null, label: 'Midiendo…' };
    const last = this.hist.slice(-60);
    const l = leq(last.map((h) => h.db));
    const voiceRatio = last.filter((h) => h.voice).length / last.length;
    const level = Math.min(1, Math.max(0, (l - 52) / 26));
    const index = Math.round(level * 70 + voiceRatio * 30);
    return { index, label: moodLabel(index) };
  }

  fire(id, nowMs, notify) {
    const last = this.lastFired.get(id);
    if (last != null && nowMs - last < COOLDOWN_SEC[id] * 1000) return null;
    this.lastFired.set(id, nowMs);
    const list = MESSAGES[id];
    return { id, text: list[Math.floor(this.rng() * list.length)], at: nowMs, notify };
  }

  reset() {
    this.run = { len: 0, swings: 0, voice: 0 };
    this.hot = 0;
    this.pending = null;
  }

  // sample: { db, voice, levels: [dB cada 100 ms] }. Devuelve { events, mood }.
  tick(nowMs, { db, voice = false, levels = [] } = {}) {
    if (db == null) {
      this.reset();
      return { events: [], mood: this.mood() };
    }
    const swings = countSwings(levels);
    this.hist.push({ db, voice, swings });
    if (this.hist.length > HIST_SEC) this.hist.shift();
    const events = [];
    if (this.hist.length < WARMUP_SEC) return { events, mood: this.mood() };

    const base = this.baseline();
    const loud = db >= Math.max(base + 8, 50);
    const push = (e) => e && events.push(e);

    // Ráfagas de volumen: corta = risa o remate de chiste; larga y con voz = discusión.
    if (loud) {
      this.run.len += 1;
      this.run.swings += swings;
      if (voice) this.run.voice += 1;
    } else if (this.run.len > 0) {
      const r = this.run;
      this.run = { len: 0, swings: 0, voice: 0 };
      if (r.len <= 5 && r.swings >= 3) push(this.fire('laugh', nowMs, false));
      else if (r.len <= 3 && r.voice >= 1) this.pending = { quiet: 0 }; // ¿remate de chiste? esperemos la reacción
    }

    if (loud && db >= Math.max(base + 8, 66) && voice) this.hot += 1;
    else this.hot = 0;
    if (this.hot === 8) push(this.fire('argument', nowMs, true));

    if (this.pending) {
      if (loud || db > base + 3) this.pending = null; // el grupo reaccionó o siguió hablando
      else if (++this.pending.quiet >= 4) {
        this.pending = null;
        push(this.fire('awkward', nowMs, false));
      }
    }

    const last60 = this.hist.slice(-60);
    if (last60.length === 60 && last60.filter((h) => h.voice).length >= 45 && leq(last60.map((h) => h.db)) >= 62) {
      push(this.fire('tension', nowMs, true));
    }

    return { events, mood: this.mood() };
  }
}

module.exports = { SocialDetector, countSwings, moodLabel };
