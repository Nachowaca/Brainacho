'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('brainacho', {
  sendAudio: (sample) => ipcRenderer.send('audio', sample),
  micAccess: () => ipcRenderer.invoke('mic-access'),
  getState: () => ipcRenderer.invoke('get-state'),
  getInsights: () => ipcRenderer.invoke('get-insights'),
  markBreak: () => ipcRenderer.invoke('mark-break'),
  setNotifications: (on) => ipcRenderer.invoke('set-notifications', on),
  calibrate: (refDb) => ipcRenderer.invoke('calibrate', refDb),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
});
