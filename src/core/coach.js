'use strict';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Cada regla: cuándo dispara, cuánto espera para repetirse y qué dice (con humor, que es la gracia).
const RULES = [
  {
    id: 'sit90',
    cooldownMin: 20,
    test: (s) => s.sitMin >= 90,
    messages: [
      (s) => `${Math.round(s.sitMin)} min sin pararte. Tu silla ya te cobra alquiler. Levantate, estirá, tomá agua.`,
      (s) => `Llevás ${Math.round(s.sitMin)} min pegado a la silla. Esto ya no es flow, es fusión.`,
    ],
  },
  {
    id: 'sit60',
    cooldownMin: 30,
    test: (s) => s.sitMin >= 60 && s.sitMin < 90,
    messages: [
      (s) => `${Math.round(s.sitMin)} min sentado. Tu espalda quiere hablar con vos. Dos minutitos de pausa.`,
      () => 'Hora de pausa: pararte, estirar el cuello y mirar algo lejano. El código/guion espera.',
    ],
  },
  {
    id: 'loud',
    cooldownMin: 20,
    minSamples: 120,
    test: (s) => s.avgDb5 != null && s.avgDb5 >= 70,
    messages: [
      (s) => `El ambiente anda en ~${Math.round(s.avgDb5)} dB. Eso no es un espacio de trabajo, es un recital. Auriculares o cambio de lugar.`,
    ],
  },
  {
    id: 'voices',
    cooldownMin: 30,
    minSamples: 120,
    test: (s) => s.voiceShare5 >= 0.5 && s.avgDb5 != null && s.avgDb5 >= 50,
    messages: [
      () => 'Hay mucha charla alrededor y las voces son lo que más rompe la concentración. Probá ruido marrón o auriculares.',
    ],
  },
  {
    id: 'silence',
    cooldownMin: 120,
    minSamples: 180,
    test: (s) => s.avgDb5 != null && s.avgDb5 <= 42 && s.sitMin >= 5 && s.sitMin < 50,
    messages: [
      () => 'Silencio de oro. Este es el momento para lo que más cuesta pensar: aprovechalo.',
    ],
  },
  {
    id: 'hydrate',
    cooldownMin: 90,
    test: (s) => s.activeMin >= 90 && s.activeMin % 90 < 1.5,
    messages: [
      () => 'Check de hidratación: ¿cuándo fue el último vaso de agua? Si no te acordás, ya sabés.',
    ],
  },
  {
    id: 'slump',
    cooldownMin: 240,
    test: (s) => s.hour >= 14.5 && s.hour < 16,
    messages: [
      () => 'Bajón de media tarde: es biología, no pereza. Tarea mecánica ahora; lo creativo, para mañana temprano.',
    ],
  },
  {
    id: 'late',
    cooldownMin: 60,
    test: (s) => (s.hour >= 23 || s.hour < 5) && s.idleMin < s.activeMin,
    messages: [
      () => 'Es tarde. Lo que escribas ahora, tu yo de mañana lo va a editar. Andá a dormir.',
    ],
  },
];

class Coach {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.lastFired = new Map();
  }

  // Devuelve a lo sumo UN mensaje por evaluación, para no volverse un molesto.
  evaluate(nowMs, snapshot) {
    for (const rule of RULES) {
      if (rule.minSamples && snapshot.recentCount < rule.minSamples) continue;
      const last = this.lastFired.get(rule.id);
      if (last != null && nowMs - last < rule.cooldownMin * 60000) continue;
      if (!rule.test(snapshot)) continue;
      this.lastFired.set(rule.id, nowMs);
      return { id: rule.id, text: pick(rule.messages, this.rng)(snapshot), at: nowMs };
    }
    return null;
  }
}

module.exports = { Coach, RULES };
