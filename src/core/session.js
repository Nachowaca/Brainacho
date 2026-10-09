'use strict';

const { noiseClass, leq } = require('./analysis');

const pad = (n) => String(n).padStart(2, '0');

function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyDay(date) {
  return {
    date,
    seconds: { total: 0, active: 0, idle: 0, measured: 0, silence: 0, calm: 0, moderate: 0, loud: 0, voice: 0 },
    breaks: 0,
    peakDb: null,
    hourly: Array.from({ length: 24 }, () => ({ sec: 0, active: 0, dbSum: 0, dbN: 0 })),
  };
}

// Acumula un día de trabajo a partir de ticks de ~1s. No toca disco ni el reloj: es testeable.
class Session {
  constructor({ breakIdleSec = 300, activeIdleSec = 60, maxGapSec = 5, recentSize = 300 } = {}) {
    this.breakIdleSec = breakIdleSec;
    this.activeIdleSec = activeIdleSec;
    this.maxGapSec = maxGapSec;
    this.recentSize = recentSize;
    this.day = null;
    this.sitSec = 0;
    this.onBreak = false;
    this.lastTick = null;
    this.recent = [];
  }

  load(day) {
    this.day = day;
  }

  markBreak() {
    this.sitSec = 0;
    this.day.breaks += 1;
  }

  // sample: { db: number|null, voice: boolean, idleSec: number }
  tick(nowMs, { db = null, voice = false, idleSec = 0 } = {}) {
    let rolled = null;
    const key = dayKey(nowMs);
    if (!this.day) this.day = emptyDay(key);
    if (this.day.date !== key) {
      rolled = this.day;
      this.day = emptyDay(key);
      this.sitSec = 0;
    }

    let dt = this.lastTick == null ? 0 : (nowMs - this.lastTick) / 1000;
    this.lastTick = nowMs;
    if (dt > this.maxGapSec) {
      // La compu durmió o la app estuvo frenada: una laguna larga cuenta como pausa, no como trabajo.
      if (dt >= this.breakIdleSec) this.markBreak();
      dt = 0;
    }

    const d = this.day;
    const hour = new Date(nowMs).getHours();
    const h = d.hourly[hour];
    const active = idleSec < this.activeIdleSec;

    d.seconds.total += dt;
    h.sec += dt;
    if (active) {
      d.seconds.active += dt;
      h.active += dt;
      this.sitSec += dt;
    } else {
      d.seconds.idle += dt;
    }

    if (idleSec >= this.breakIdleSec) {
      if (!this.onBreak) {
        this.onBreak = true;
        this.markBreak();
      }
    } else {
      this.onBreak = false;
    }

    if (db != null) {
      d.seconds.measured += dt;
      d.seconds[noiseClass(db)] += dt;
      if (voice) d.seconds.voice += dt;
      d.peakDb = d.peakDb == null ? db : Math.max(d.peakDb, db);
      h.dbSum += db * dt;
      h.dbN += dt;
      this.recent.push({ db, voice });
      if (this.recent.length > this.recentSize) this.recent.shift();
    }

    return { snapshot: this.snapshot(nowMs, db), rolled };
  }

  snapshot(nowMs, db = null) {
    const d = this.day;
    const date = new Date(nowMs);
    const recentDbs = this.recent.map((r) => r.db);
    const avgDb5 = leq(recentDbs);
    return {
      date: d.date,
      hour: date.getHours() + date.getMinutes() / 60,
      db,
      avgDb5,
      noiseClass: avgDb5 == null ? null : noiseClass(avgDb5),
      voiceShare5: this.recent.length ? this.recent.filter((r) => r.voice).length / this.recent.length : 0,
      recentCount: this.recent.length,
      sitMin: this.sitSec / 60,
      activeMin: d.seconds.active / 60,
      idleMin: d.seconds.idle / 60,
      silenceMin: d.seconds.silence / 60,
      loudMin: d.seconds.loud / 60,
      measuredMin: d.seconds.measured / 60,
      voiceMin: d.seconds.voice / 60,
      breaks: d.breaks,
      peakDb: d.peakDb,
      hourly: d.hourly.map((x) => ({
        activePct: x.sec > 0 ? x.active / x.sec : 0,
        avgDb: x.dbN > 0 ? x.dbSum / x.dbN : null,
        sec: x.sec,
      })),
    };
  }
}

module.exports = { Session, emptyDay, dayKey };
