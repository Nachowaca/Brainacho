'use strict';

const $ = (id) => document.getElementById(id);
const FFT_SIZE = 2048;
let analyser, audioCtx, timeBuf, freqBuf;
let micRunning = false;

// ---------- Audio: solo se calculan números, el sonido nunca se guarda ni se envía ----------
async function startMic() {
  if (micRunning) return;
  if (!(await window.brainacho.micAccess())) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    src.connect(analyser);
    timeBuf = new Float32Array(analyser.fftSize);
    freqBuf = new Float32Array(analyser.frequencyBinCount);
    micRunning = true;
    stream.getAudioTracks()[0].addEventListener('ended', () => { micRunning = false; });
    setInterval(sampleAudio, 100);
    requestAnimationFrame(drawSpectrum);
  } catch (err) {
    console.warn('Micrófono no disponible:', err.message);
  }
}

let energyAcc = 0;
let accN = 0;
let lastSend = 0;

function sampleAudio() {
  analyser.getFloatTimeDomainData(timeBuf);
  let sum = 0;
  for (const v of timeBuf) sum += v * v;
  energyAcc += sum / timeBuf.length;
  accN += 1;

  const now = performance.now();
  const instRms = Math.sqrt(sum / timeBuf.length);
  const instDb = 20 * Math.log10(Math.max(instRms, 1e-8));
  $('meter').style.width = `${Math.min(100, Math.max(0, ((instDb + 90) / 70) * 100))}%`;

  if (now - lastSend >= 1000) {
    analyser.getFloatFrequencyData(freqBuf);
    // Promedio en energía del último segundo => dBFS.
    const dbfs = 10 * Math.log10(Math.max(energyAcc / accN, 1e-16));
    window.brainacho.sendAudio({ dbfs, bins: freqBuf.slice(), sampleRate: audioCtx.sampleRate, fftSize: FFT_SIZE });
    energyAcc = 0; accN = 0; lastSend = now;
  }
}

function drawSpectrum() {
  const c = $('spectrum');
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  if (micRunning) {
    analyser.getFloatFrequencyData(freqBuf);
    const bars = 64;
    const maxBin = Math.floor(freqBuf.length * (8000 / (audioCtx.sampleRate / 2)));
    const step = Math.floor(maxBin / bars);
    const w = c.width / bars;
    for (let i = 0; i < bars; i++) {
      let m = -140;
      for (let j = 0; j < step; j++) m = Math.max(m, freqBuf[i * step + j + 1]);
      const h = Math.max(1, ((m + 100) / 70) * c.height);
      g.fillStyle = '#7c9cff';
      g.fillRect(i * w + 1, c.height - h, w - 2, h);
    }
  }
  requestAnimationFrame(drawSpectrum);
}

// ---------- UI ----------
const fmt = (n) => Math.round(n);
const NOISE_NOTES = {
  silence: 'Silencio: ideal para pensar profundo.',
  calm: 'Ambiente tranquilo: bueno para concentrarse.',
  moderate: 'Ruido moderado: tolerable, pero te cansa.',
  loud: 'Demasiado ruido para concentrarse.',
};
const tone = (v) => (v >= 70 ? 'var(--good)' : v >= 40 ? 'var(--warn)' : 'var(--bad)');

function setBar(id, v) {
  const el = $(id);
  if (v == null) { el.style.width = '0'; return; }
  el.style.width = `${fmt(v)}%`;
  el.style.background = tone(v);
}

function render(state) {
  if (!state) return;
  const { snapshot: s, energy, coach, micOk } = state;
  $('score').textContent = energy.score;
  $('label').textContent = energy.label;
  $('ring').style.setProperty('--p', energy.score);
  $('ring').style.setProperty('--c', tone(energy.score));
  setBar('p-noise', energy.parts.noise);
  setBar('p-sit', energy.parts.sit);
  setBar('p-rhythm', energy.parts.rhythm);
  $('mic-warning').hidden = micOk;

  $('db').textContent = s.db == null ? '--' : fmt(s.db);
  $('noise-note').textContent = s.noiseClass ? NOISE_NOTES[s.noiseClass] : ' ';
  $('sit').textContent = fmt(s.sitMin);
  $('active').textContent = fmt(s.activeMin);
  $('breaks').textContent = s.breaks;
  $('silence').textContent = fmt(s.silenceMin);
  $('loud').textContent = fmt(s.loudMin);
  $('notif').checked = state.settings.notifications;

  renderHours(s);
  if (coach) addLog(coach);
}

function renderHours(s) {
  const box = $('hours');
  if (!box.children.length) {
    for (let h = 0; h < 24; h++) {
      const d = document.createElement('div');
      d.innerHTML = `<i></i>${h % 3 === 0 ? h : '&nbsp;'}`;
      box.appendChild(d);
    }
  }
  const nowH = Math.floor(s.hour);
  [...box.children].forEach((d, h) => {
    d.firstChild.style.height = `${Math.max(2, s.hourly[h].activePct * 100)}%`;
    d.classList.toggle('now', h === nowH);
    d.title = `${h}:00 — ${fmt(s.hourly[h].activePct * 100)}% activo${s.hourly[h].avgDb != null ? `, ~${fmt(s.hourly[h].avgDb)} dB` : ''}`;
  });
}

const seen = new Set();
function addLog(msg) {
  if (seen.has(msg.at)) return;
  seen.add(msg.at);
  const log = $('log');
  if (log.firstChild && log.firstChild.classList.contains('muted')) log.innerHTML = '';
  const li = document.createElement('li');
  const t = document.createElement('time');
  t.textContent = new Date(msg.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  li.append(t, document.createTextNode(msg.text)); // textContent: nada se interpreta como HTML
  log.prepend(li);
}

async function loadInsights() {
  const r = await window.brainacho.getInsights();
  $('best').textContent = r.ready && r.hours.length
    ? `Tus horas más activas: ${r.hours.map((h) => `${h.hour}:00`).join(', ')} (según ${r.days} días de datos).`
    : `Tus horas ideales aparecen con 3 días de datos (llevás ${r.days}). Mientras tanto, uso un ritmo promedio.`;
}

$('break-btn').addEventListener('click', () => window.brainacho.markBreak());
$('notif').addEventListener('change', (e) => window.brainacho.setNotifications(e.target.checked));
$('calib-btn').addEventListener('click', async () => {
  const off = await window.brainacho.calibrate($('ref').value);
  $('calib-out').textContent = off == null ? 'Poné un valor entre 20 y 110 con el micrófono activo.' : `Listo (offset ${off} dB).`;
});

window.brainacho.onState(render);
window.brainacho.getState().then(render);
loadInsights();
setInterval(loadInsights, 10 * 60 * 1000);
startMic();
