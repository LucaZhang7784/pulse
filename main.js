'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { fetchAll, PROVIDERS } = require('./src/providers');

// V2 keeps usage readouts visible in an 84px rail. The rail height follows the
// provider count (one 79px row + gap per provider) so every provider stays
// reachable without a hidden scrollbar, clamped to the display work area.
const RAIL_WIDTH = 84;
const RAIL_CHROME = 30 + 42 + 8; // drag handle + footer + padding
const RAIL_ROW = 79 + 3;
const RAIL_HEIGHT = RAIL_CHROME + PROVIDERS.length * RAIL_ROW;

// Never let the rail run past the display's work area; the provider list
// scrolls when a small screen forces the clamp.
function railHeight(wa) {
  const available = wa && wa.height ? wa.height - 16 : RAIL_HEIGHT;
  return Math.max(320, Math.min(RAIL_HEIGHT, available));
}
const CARD_WIDTH = 390;
const CARD_HEIGHT = 1000;
const CARD_GAP = 12;
const DEFAULT_REFRESH_SECONDS = 60;

// Enable transparent visual layering and avoid DWM black bounding artifacts on Windows
app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu-compositing', 'false');

// Pin the Windows identity so a tray-resident app never surfaces a stray
// taskbar button under Electron's default AppUserModelId.
app.setAppUserModelId('com.pulse.windows');

let win = null;
let tray = null;
let pollTimer = null;
let config = null;
let settingsWin = null;
let cardWin = null;
let cardReady = false;
let cardVisible = false;
let currentCardProvider = null;
let cardFadeTimer = null;
let reduceMotion = false;
let railExpanded = true;
let railCollapseTimer = null;
let menuOpen = false;
let blurTimer = null;
let railStateRevision = 0;
let awaitingCardReveal = 0;
let cardRenderRevision = 0;

function applyGlass(window) {
  // Do not override setBackgroundMaterial to 'none' on Windows frameless transparent windows,
  // as Windows DWM will treat 'none' as an opaque RGB(0,0,0) black background brush.
}

function applyRailShape() {
  if (!win || win.isDestroyed()) return;
  const wa = workAreaFor(win);
  const width = railExpanded ? RAIL_WIDTH : 6;
  const height = railHeight(wa);
  const x = config.dock === 'left' ? wa.x : wa.x + wa.width - width;
  const y = Math.min(Math.max(win.getBounds().y, wa.y), wa.y + wa.height - height);
  win.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: width,
    height: height
  });
}

function expandRail() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(blurTimer);
  railStateRevision++;
  clearTimeout(railCollapseTimer);
  railExpanded = true;
  applyRailShape();
  win.webContents.send('rail:state', true);
  win.show();
  win.focus();
}

function collapseRail() {
  if (!win || win.isDestroyed()) return;
  snapToNearestEdge();
  clearTimeout(blurTimer);
  railStateRevision++;
  railExpanded = false;
  hideCard();
  win.webContents.send('rail:state', false);
  clearTimeout(railCollapseTimer);
  // Apply shape immediately so the window width shrinks to 6px without delay,
  // preventing residual transparent/grey hitboxes and enabling instant re-opening
  applyRailShape();
}

function collapseOnBlur() {
  clearTimeout(blurTimer);
  const revision = railStateRevision;
  blurTimer = setTimeout(() => {
    if (revision !== railStateRevision) return;
    if (railExpanded && !menuOpen && !win?.isFocused() && !(cardVisible && cardWin?.isFocused())) {
      collapseRail();
    }
  }, 100);
}

function fadeCard(target, duration) {
  clearInterval(cardFadeTimer);
  cardFadeTimer = null;
  if (!cardWin || cardWin.isDestroyed()) return;
  const window = cardWin;
  const start = window.getOpacity();
  const started = Date.now();
  const step = () => {
    if (window.isDestroyed()) { clearInterval(cardFadeTimer); cardFadeTimer = null; return; }
    const progress = reduceMotion ? 1 : Math.min(1, (Date.now() - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.setOpacity(start + (target - start) * eased);
    if (progress === 1) {
      clearInterval(cardFadeTimer);
      cardFadeTimer = null;
      if (target === 0) window.hide();
    }
  };
  cardFadeTimer = setInterval(step, 16);
  step();
}

const configPath = () => path.join(app.getPath('userData'), 'settings.json');

const defaultConfig = () => ({
  dock: 'right',
  floatPosition: { x: null, y: null },
  openRouterKey: '',
  deepSeekKey: '',
  kimiKey: '',
  xiaomiCookie: '',
  vercelKey: '',
  minimaxKey: '',
  zhipuKey: '',
  ofoxKey: '',
  refreshSeconds: DEFAULT_REFRESH_SECONDS,
});

// The credential map handed to the provider registry. Pasted keys win over the
// auto-imported CC Switch / local ones, which the registry resolves itself.
function credentialPatch() {
  return {
    openRouter: config.openRouterKey,
    deepSeek: config.deepSeekKey,
    kimi: config.kimiKey,
    xiaomiMiMo: config.xiaomiCookie,
    vercelAiGateway: config.vercelKey,
    minimax: config.minimaxKey,
    zhipu: config.zhipuKey,
    ofox: config.ofoxKey,
  };
}

function loadConfig() {
  try {
    config = { ...defaultConfig(), ...JSON.parse(fs.readFileSync(configPath(), 'utf8')) };
  } catch {
    config = defaultConfig();
  }
  if (!['left', 'right'].includes(config.dock)) config.dock = 'right';
  return config;
}

function saveConfig() {
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('saveConfig failed', err);
  }
}

function workAreaFor(win) {
  try {
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds();
      const display = screen.getDisplayMatching(bounds);
      if (display && display.workArea) return display.workArea;
    }
  } catch {}
  return screen.getPrimaryDisplay().workArea;
}

// The rail is a fixed-size overlay. Windows can nudge a frameless transparent
// window off its size (Aero Snap, DPI/scale changes, double-click maximize),
// so re-assert the exact geometry whenever anything tries to change it.
function applyRailSize() {
  if (!win || win.isDestroyed()) return;
  if (win.isMaximized()) win.unmaximize();
  const wa = workAreaFor(win);
  const height = railHeight(wa);
  const width = railExpanded ? RAIL_WIDTH : 6;
  const [w, h] = win.getSize();
  if (w !== width || h !== height) {
    win.setSize(width, height);
  }
}

function applyDock() {
  if (!win || win.isDestroyed()) return;
  const wa = workAreaFor(win);
  const width = railExpanded ? RAIL_WIDTH : 6;
  const height = railHeight(wa);
  const [x, y] = positionFor(config.dock, wa, width);
  const nx = Math.round(x);
  const ny = Math.round(Math.min(Math.max(y, wa.y), wa.y + wa.height - height));
  win.setBounds({ x: nx, y: ny, width, height });
  win.webContents.send('dock:updated', config.dock);
}

function positionFor(dock, wa, width) {
  const centeredY = wa.y + Math.round((wa.height - railHeight(wa)) / 2);
  if (dock === 'left') return [wa.x, centeredY];
  if (dock === 'right') return [wa.x + wa.width - width, centeredY];
  if (dock === 'float' && config.floatPosition.x !== null) {
    return [config.floatPosition.x, config.floatPosition.y];
  }
  return [wa.x + wa.width - width, centeredY];
}

// After a drag settles, keep the rail attached to the nearest display edge.
let moveSettleTimer = null;
function scheduleSnap() {
  clearTimeout(moveSettleTimer);
  moveSettleTimer = setTimeout(snapToNearestEdge, 250);
}

function snapToNearestEdge() {
  if (!win || win.isDestroyed() || !railExpanded) return;
  const b = win.getBounds();
  const wa = screen.getDisplayMatching(b).workArea;

  const dock = b.x + b.width / 2 < wa.x + wa.width / 2 ? 'left' : 'right';

  if (dock !== config.dock) {
    config.dock = dock;
    saveConfig();
  }
  applyDock();
}

// The detail card is a separate popup window, so the rail never moves or
// resizes. Which side it opens on follows the rail's position on screen: a
// rail on the left edge opens the card to its right, a rail on the right edge
// opens to its left, and a floating rail picks the side with more room.
function cardSide() {
  if (config.dock === 'left') return 'right';
  if (config.dock === 'right') return 'left';
  const b = win.getBounds();
  const wa = screen.getDisplayMatching(b).workArea;
  const center = b.x + b.width / 2;
  const screenCenter = wa.x + wa.width / 2;
  return center < screenCenter ? 'right' : 'left';
}

function ensureCardWindow() {
  if (cardWin && !cardWin.isDestroyed()) return;
  cardReady = false;
  cardWin = new BrowserWindow({
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    backgroundColor: '#00000000',
    opacity: 0,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  cardWin.setAlwaysOnTop(true, 'screen-saver');
  cardWin.on('blur', collapseOnBlur);
  cardWin.loadFile(path.join(__dirname, 'renderer', 'card.html'));
  cardWin.webContents.once('did-finish-load', () => {
    cardReady = true;
    if (currentCardProvider) cardWin.webContents.send('card:data', currentCardProvider, cardRenderRevision);
  });
  cardWin.webContents.on('ipc-message', (_event, channel, revision) => {
    if (channel !== 'card:prepared' || revision !== awaitingCardReveal || !cardVisible) return;
    awaitingCardReveal = 0;
    fadeCard(1, 250);
  });
  cardWin.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); hideCard(); }
  });
  cardWin.on('closed', () => { clearInterval(cardFadeTimer); cardFadeTimer = null; cardWin = null; cardReady = false; cardVisible = false; });
}

function showCard(provider, focus = false) {
  if (!win || !win.isVisible() || !railExpanded) return;
  ensureCardWindow();
  currentCardProvider = provider;
  cardRenderRevision++;
  awaitingCardReveal = cardRenderRevision;

  const rail = win.getBounds();
  const side = cardSide();
  const wa = screen.getDisplayMatching(rail).workArea;
  const width = Math.min(CARD_WIDTH, wa.width);
  const height = Math.min(CARD_HEIGHT, Math.max(1, wa.height - 24));
  const preferredX = side === 'left' ? rail.x - width - CARD_GAP : rail.x + rail.width + CARD_GAP;
  const x = Math.max(wa.x, Math.min(preferredX, wa.x + wa.width - width));
  const y = Math.max(wa.y, Math.min(rail.y + Math.round((rail.height - height) / 2), wa.y + wa.height - height));
  cardWin.setBounds({ x: Math.round(x), y: Math.round(y), width, height });
  cardWin.setFocusable(true);
  cardWin.setIgnoreMouseEvents(false);
  cardWin.setAlwaysOnTop(true, 'screen-saver');
  cardWin.showInactive();
  cardWin.moveTop();
  cardVisible = true;
  if (cardReady) cardWin.webContents.send('card:data', provider, cardRenderRevision);
  win.webContents.send('card:selection', provider.id);
  if (focus) cardWin.focus();
}

function hideCard() {
  if (cardWin && !cardWin.isDestroyed()) {
    if (railExpanded && cardWin.isFocused()) win?.focus();
    cardWin.setIgnoreMouseEvents(true);
    fadeCard(0, 320);
  }
  cardVisible = false;
  awaitingCardReveal = 0;
  if (win && !win.isDestroyed()) win.webContents.send('card:selection', null);
}

function createWindow() {
  win = new BrowserWindow({
    width: railExpanded ? RAIL_WIDTH : 6,
    height: railHeight(screen.getPrimaryDisplay().workArea),
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    backgroundColor: '#00000000',
    opacity: 1,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  applyGlass(win);
  win.setSkipTaskbar(true);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('blur', collapseOnBlur);

  const reveal = () => {
    if (!win || win.isDestroyed()) return;
    applyDock();
    win.show();
    win.setAlwaysOnTop(true, 'screen-saver');
  };

  win.once('ready-to-show', reveal);

  win.on('move', scheduleSnap);
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); collapseRail(); }
  });

  win.on('closed', () => { win = null; });
}

function startPolling() {
  stopPolling();
  const interval = Math.max(15, config.refreshSeconds || DEFAULT_REFRESH_SECONDS) * 1000;
  refresh();
  pollTimer = setInterval(refresh, interval);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function refresh() {
  try {
    const results = await fetchAll(credentialPatch());
    if (currentCardProvider && cardWin && !cardWin.isDestroyed()) {
      const updated = results.find((provider) => provider.id === currentCardProvider.id);
      if (updated) { currentCardProvider = updated; if (cardReady) cardWin.webContents.send('card:data', updated); }
    }
    if (win && !win.isDestroyed()) win.webContents.send('providers:updated', results);
    return results;
  } catch (err) {
    console.error('refresh failed', err);
    return [];
  }
}

function buildMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Refresh now', click: () => refresh() },
    { type: 'separator' },
    {
      label: 'Dock',
      submenu: [
        { label: 'Left', type: 'radio', checked: config.dock === 'left', click: () => { config.dock = 'left'; saveConfig(); applyDock(); } },
        { label: 'Right', type: 'radio', checked: config.dock === 'right', click: () => { config.dock = 'right'; saveConfig(); applyDock(); } },
      ],
    },
    { label: 'Settings…', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Quit Pulse', click: () => app.quit() },
  ]);
  menu.on('menu-will-show', () => { menuOpen = true; });
  menu.on('menu-will-close', () => { menuOpen = false; collapseOnBlur(); });
  return menu;
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('Pulse — AI coding allowances');
  tray.setContextMenu(buildMenu());
  tray.on('click', () => {
    if (win) {
      if (railExpanded) collapseRail();
      else expandRail();
    }
  });
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  const wa = screen.getPrimaryDisplay().workArea;
  settingsWin = new BrowserWindow({
    width: 460,
    height: Math.max(480, Math.min(860, wa.height - 60)),
    frame: true,
    resizable: false,
    minimizable: true,
    maximizable: false,
    skipTaskbar: true,
    title: 'Pulse Settings',
    transparent: true,
    backgroundColor: '#00000000',
    opacity: 0.85,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  applyGlass(settingsWin);
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// --json prints the last readings and exits (for tmux / shell prompts).
function runJSON() {
  loadConfig();
  fetchAll(credentialPatch())
    .then((results) => {
      process.stdout.write(JSON.stringify(results, null, 2) + '\n');
      app.exit(0);
    })
    .catch((err) => {
      process.stderr.write(String(err && err.stack || err) + '\n');
      app.exit(1);
    });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { expandRail(); win.setSkipTaskbar(true); }
  });

  if (process.argv.includes('--json')) {
    app.whenReady().then(runJSON);
  } else {
    app.whenReady().then(() => {
      loadConfig();
      createWindow();
      createTray();
      startPolling();
      // DPI/scale changes can rescale a frameless window; snap back.
      screen.on('display-metrics-changed', () => applyDock());
    });
  }

  app.on('window-all-closed', (e) => {
    // Keep running in the tray; only quit explicitly.
  });

  app.on('before-quit', () => {
    clearInterval(cardFadeTimer);
    clearTimeout(railCollapseTimer);
    clearTimeout(blurTimer);
    clearTimeout(moveSettleTimer);
    stopPolling();
  });
}

// IPC
ipcMain.handle('providers:fetch', () => refresh());

ipcMain.handle('settings:get', () => ({ ...config }));

ipcMain.handle('settings:set', (event, patch) => {
  Object.assign(config, patch || {});
  saveConfig();
  if (patch && 'refreshSeconds' in patch) startPolling();
  if (patch && ['openRouterKey', 'deepSeekKey', 'kimiKey', 'xiaomiCookie', 'vercelKey', 'minimaxKey', 'zhipuKey', 'ofoxKey'].some((k) => k in patch)) refresh();
  return { ...config };
});

ipcMain.handle('dock:set', (event, dock) => {
  if (['left', 'right'].includes(dock)) {
    config.dock = dock;
    saveConfig();
    applyDock();
  }
  return config.dock;
});

ipcMain.handle('card:toggle', (event, provider, options) => {
  reduceMotion = options?.reduceMotion === true;
  if (cardVisible && currentCardProvider?.id === provider.id) hideCard();
  else showCard(provider, options?.focus === true);
  return cardVisible ? currentCardProvider?.id : null;
});

ipcMain.handle('card:get', () => currentCardProvider);
ipcMain.handle('rail:get', () => railExpanded);
ipcMain.handle('rail:expand', (event, options) => {
  if (event.sender !== win?.webContents) return;
  reduceMotion = options?.reduceMotion === true;
  expandRail();
});
ipcMain.handle('card:close', () => { hideCard(); return true; });
ipcMain.handle('card:resize', (event, contentHeight) => {
  if (!cardWin || cardWin.isDestroyed() || event.sender !== cardWin.webContents || !Number.isFinite(contentHeight)) return;
  const bounds = cardWin.getBounds();
  const wa = screen.getDisplayMatching(bounds).workArea;
  const height = Math.min(Math.max(240, Math.ceil(contentHeight)), CARD_HEIGHT, Math.max(1, wa.height - 24));
  const y = Math.max(wa.y + 12, Math.min(bounds.y + Math.round((bounds.height - height) / 2), wa.y + wa.height - height - 12));
  cardWin.setBounds({ ...bounds, y: Math.round(y), height });
});

ipcMain.handle('window:quit', () => { app.quit(); });

ipcMain.handle('settings:open', () => { openSettings(); return true; });

ipcMain.handle('menu:popup', () => {
  if (tray) {
    menuOpen = true;
    tray.popUpContextMenu(buildMenu());
  }
  return true;
});

