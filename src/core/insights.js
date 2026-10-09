'use strict';

// Tus mejores horas según actividad real. Con < minDays días no se afirma nada.
function bestHours(days, { minDays = 3, minSecPerHour = 600, top = 3 } = {}) {
  if (days.length < minDays) return { ready: false, days: days.length, hours: [] };
  const acc = Array.from({ length: 24 }, () => ({ sec: 0, active: 0, dbSum: 0, dbN: 0 }));
  for (const day of days) {
    day.hourly.forEach((h, i) => {
      acc[i].sec += h.sec;
      acc[i].active += h.active;
      acc[i].dbSum += h.dbSum;
      acc[i].dbN += h.dbN;
    });
  }
  const ranked = acc
    .map((h, hour) => ({
      hour,
      activePct: h.sec ? h.active / h.sec : 0,
      avgDb: h.dbN ? h.dbSum / h.dbN : null,
      sec: h.sec,
    }))
    .filter((h) => h.sec >= minSecPerHour)
    .sort((a, b) => b.activePct - a.activePct)
    .slice(0, top);
  return { ready: true, days: days.length, hours: ranked };
}

module.exports = { bestHours };
