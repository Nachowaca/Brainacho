'use strict';

const fs = require('fs');
const path = require('path');
const { emptyDay } = require('./session');

// Un JSON por día en la carpeta de datos de la app. Solo números: nunca audio.
class Store {
  constructor(dir) {
    this.dir = dir;
    this.daysDir = path.join(dir, 'days');
    this.settingsFile = path.join(dir, 'settings.json');
    fs.mkdirSync(this.daysDir, { recursive: true });
  }

  saveDay(day) {
    const file = path.join(this.daysDir, `${day.date}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(day));
    fs.renameSync(tmp, file);
  }

  loadDay(date) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(this.daysDir, `${date}.json`), 'utf8'));
      const base = emptyDay(date);
      return { ...base, ...raw, seconds: { ...base.seconds, ...raw.seconds } };
    } catch {
      return null;
    }
  }

  listDays(limit = 30) {
    const files = fs.readdirSync(this.daysDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(-limit);
    return files.map((f) => this.loadDay(f.replace('.json', ''))).filter(Boolean);
  }

  loadSettings() {
    const defaults = { offsetDb: 90, notifications: true };
    try {
      return { ...defaults, ...JSON.parse(fs.readFileSync(this.settingsFile, 'utf8')) };
    } catch {
      return defaults;
    }
  }

  saveSettings(settings) {
    fs.writeFileSync(this.settingsFile, JSON.stringify(settings));
  }
}

module.exports = { Store };
