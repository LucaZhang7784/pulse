'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pulse', {
  fetchProviders: () => ipcRenderer.invoke('providers:fetch'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getRailState: () => ipcRenderer.invoke('rail:get'),
  expandRail: () => ipcRenderer.invoke('rail:expand', { reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches }),
  onRailState: (cb) => ipcRenderer.on('rail:state', (event, expanded) => cb(expanded)),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  setDock: (dock) => ipcRenderer.invoke('dock:set', dock),
  toggleCard: (provider, options) => ipcRenderer.invoke('card:toggle', provider, { ...options, reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches }),
  closeCard: () => ipcRenderer.invoke('card:close'),
  fitCardHeight: (height) => ipcRenderer.invoke('card:resize', height),
  onCardSelection: (cb) => ipcRenderer.on('card:selection', (event, id) => cb(id)),
  getCardData: () => ipcRenderer.invoke('card:get'),
  popupMenu: () => ipcRenderer.invoke('menu:popup'),
  openSettings: () => ipcRenderer.invoke('settings:open'),
  quit: () => ipcRenderer.invoke('window:quit'),
  onProviders: (cb) => ipcRenderer.on('providers:updated', (event, data) => cb(data)),
  onDock: (cb) => ipcRenderer.on('dock:updated', (event, dock) => cb(dock)),
  onCardData: (cb) => ipcRenderer.on('card:data', (event, data, revision) => cb(data, revision)),
  cardPrepared: (revision) => ipcRenderer.send('card:prepared', revision),
});
