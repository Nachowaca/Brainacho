'use strict';

const path = require('path');
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, powerMonitor, nativeImage, session, systemPreferences } = require('electron');

const { dbfsToDb, voiceBandShare, looksLikeVoice } = require('./core/analysis');
const { energyScore } = require('./core/score');
const { Session, emptyDay, dayKey } = require('./core/session');
const { Coach } = require('./core/coach');
const { SocialDetector } = require('./core/social');
const { bestHours } = require('./core/insights');
const { Store } = require('./core/store');

const SAMPLE_MAX_AGE_MS = 3000;
const SAVE_EVERY_MS = 60 * 1000;

let win = null;
let tray = null;
let store;
let settings;
const tracker = new Session();
const coach = new Coach();
const social = new SocialDetector();
let lastAudio = null;
const recentDbfs = [];
let lastState = null;
let quitting = false;

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 760,
    backgroundColor: '#0f1115',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // la medición sigue aunque la ventana esté oculta
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // En Mac cerrar la ventana no corta la medición: queda en la barra de menú.
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('🧠 --');
  tray.setToolTip('Brainacho');
  const showWin = () => {
    win.show();
    win.focus();
  };
  tray.on('click', showWin);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir Brainacho', click: showWin },
      { label: 'Registrar pausa ahora', click: () => tracker.markBreak() },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() },
    ]),
  );
}

function buildState(nowMs, snapshot, coachMsg, events, mood) {
  const energy = energyScore({ db: snapshot.recentCount ? snapshot.avgDb5 : null, sitMin: snapshot.sitMin, hour: snapshot.hour });
  return { now: nowMs, snapshot, energy, coach: coachMsg, events, mood, settings, micOk: lastAudio != null && nowMs - lastAudio.at < SAMPLE_MAX_AGE_MS };
}

function tick() {
  const nowMs = Date.now();
  let db = null;
  let voice = false;
  let levels = [];
  if (settings.micConsent && lastAudio && nowMs - lastAudio.at < SAMPLE_MAX_AGE_MS) {
    db = dbfsToDb(lastAudio.dbfs, settings.offsetDb);
    voice = looksLikeVoice(voiceBandShare(lastAudio.bins, lastAudio.sampleRate, lastAudio.fftSize), db);
    levels = (lastAudio.levels || []).map((v) => dbfsToDb(v, settings.offsetDb));
  }
  const idleSec = powerMonitor.getSystemIdleTime();
  const { snapshot: first, rolled } = tracker.tick(nowMs, { db, voice, idleSec });
  if (rolled) store.saveDay(rolled);

  const { events, mood } = social.tick(nowMs, { db, voice, levels });
  events.forEach((e) => tracker.recordEvent(e.id));
  const snapshot = events.length ? tracker.snapshot(nowMs, db) : first;
  for (const e of events.filter((ev) => ev.notify)) {
    if (settings.notifications && Notification.isSupported()) new Notification({ title: 'Brainacho · clima del grupo', body: e.text, silent: true }).show();
  }

  const msg = coach.evaluate(nowMs, snapshot);
  if (msg && settings.notifications && Notification.isSupported()) {
    new Notification({ title: 'Brainacho', body: msg.text, silent: true }).show();
  }

  lastState = buildState(nowMs, snapshot, msg, events, mood);
  tray.setTitle(`🧠 ${lastState.energy.score}`);
  if (win && !win.isDestroyed() && win.isVisible()) win.webContents.send('state', lastState);
}

function setupIpc() {
  ipcMain.on('audio', (_e, sample) => {
    lastAudio = { ...sample, at: Date.now() };
    recentDbfs.push(sample.dbfs);
    if (recentDbfs.length > 5) recentDbfs.shift();
  });
  ipcMain.handle('get-state', () => lastState);
  ipcMain.handle('get-settings', () => settings);
  ipcMain.handle('set-mic-consent', (_e, on) => {
    settings = { ...settings, micConsent: !!on };
    store.saveSettings(settings);
    if (!on) lastAudio = null;
    return settings.micConsent;
  });
  ipcMain.handle('get-insights', () => bestHours(store.listDays(60)));
  ipcMain.handle('mic-access', async () => {
    if (process.platform !== 'darwin') return true;
    if (systemPreferences.getMediaAccessStatus('microphone') === 'granted') return true;
    return systemPreferences.askForMediaAccess('microphone');
  });
  ipcMain.handle('mark-break', () => tracker.markBreak());
  ipcMain.handle('set-notifications', (_e, on) => {
    settings = { ...settings, notifications: !!on };
    store.saveSettings(settings);
  });
  // Calibración: el usuario mide con otro sonómetro (ej. una app del celular) y nos pasa el valor.
  ipcMain.handle('calibrate', (_e, refDb) => {
    const ref = Number(refDb);
    if (!Number.isFinite(ref) || ref < 20 || ref > 110 || !recentDbfs.length) return null;
    const avg = recentDbfs.reduce((a, b) => a + b, 0) / recentDbfs.length;
    settings = { ...settings, offsetDb: Math.round(ref - avg) };
    store.saveSettings(settings);
    return settings.offsetDb;
  });
}

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  settings = store.loadSettings();
  const today = dayKey(Date.now());
  tracker.load(store.loadDay(today) || emptyDay(today));

  // Solo se concede el micrófono a nuestra propia ventana.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));

  setupIpc();
  createWindow();
  createTray();
  setInterval(tick, 1000);
  setInterval(() => store.saveDay(tracker.day), SAVE_EVERY_MS);

  app.on('activate', () => win.show());
});

app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  quitting = true;
  if (tracker.day) store.saveDay(tracker.day);
});
