/**
 * GymRise
 * Файл: js/main.js
 * Автор и правообладатель: © Alexulyanovsk
 */

import { loadState, saveState, flushNow, importData, state } from './state.js';
import { render, ACTIONS, renderLibraryList, initBridgeEvents, handleBack } from './ui.js';
import { uiConfirm, uiAlert, closeApp } from './bridge.js';
import { LIMITS } from './data.js';

let initDone = false;

function showFatalError(err) {
  console.error('[GymRise Fatal]', err);
  const app = document.getElementById('app');
  if (!app) return;
  app.className = '';
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:20px;color:#FF6B6B;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;';
  const msg = document.createElement('div');
  msg.textContent = 'Ошибка запуска: ' + (err?.message || String(err));
  msg.style.cssText = 'margin-bottom:12px;font-weight:bold;';
  const details = document.createElement('details');
  const sum = document.createElement('summary');
  sum.textContent = 'Технические детали';
  sum.style.cssText = 'cursor:pointer;color:#8E8E93;margin-bottom:8px;';
  const pre = document.createElement('pre');
  pre.textContent = err?.stack || '(no stack)';
  pre.style.cssText = 'font-size:11px;color:#8E8E93;margin:0;white-space:pre-wrap;';
  details.appendChild(sum);
  details.appendChild(pre);
  const reload = document.createElement('button');
  reload.textContent = 'Перезапустить';
  reload.style.cssText = 'margin-top:16px;padding:12px 20px;background:#CCFF00;color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-family:inherit;';
  reload.onclick = () => location.reload();
  wrap.appendChild(msg);
  wrap.appendChild(details);
  wrap.appendChild(reload);
  app.appendChild(wrap);
}

window.addEventListener('error', e => {
  if (!initDone) showFatalError(e.error || new Error(String(e.message)));
  else console.error('[GymRise] Runtime error:', e.error);
});

window.addEventListener('unhandledrejection', e => {
  if (!initDone) showFatalError(e.reason);
  else console.error('[GymRise] Unhandled rejection:', e.reason);
});

document.body.addEventListener('click', ev => {
  if (ev.target.id === 'addDialogBackdrop') { ACTIONS.closeAddDialog(); return; }
  if (ev.target.id === 'newDayDialogBackdrop') { ACTIONS.closeNewDay(); return; }
  if (ev.target.id === 'csvModalBackdrop') { ACTIONS.closeCsvModal(); return; }
  const el = ev.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
});

document.addEventListener('error', ev => {
  const t = ev.target;
  if (t && t.tagName === 'IMG' && t.parentElement?.classList.contains('gif-block')) {
    t.style.display = 'none';
    t.parentElement.classList.add('no-gif');
  }
}, true);

let searchDebounceTimer = null;
document.body.addEventListener('input', ev => {
  if (ev.target.id === 'newDayNameInput') state.newDayName = ev.target.value;
  if (ev.target.id === 'searchInput' && state.screen === 'library') {
    state.libSearch = ev.target.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      const list = document.getElementById('libList');
      if (list) list.innerHTML = renderLibraryList();
      saveState();
    }, LIMITS.searchDebounceMs);
  }
});

document.body.addEventListener('keydown', ev => {
  if (ev.target.id === 'newDayNameInput' && ev.key === 'Enter') { ev.preventDefault(); ACTIONS.createNewDay(); }
});

document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importData(file);
    render();
  } catch (err) {
    uiAlert('Ошибка импорта: ' + (err?.message || 'неверный формат файла'));
  }
  e.target.value = '';
});

function emergencySave() {
  try {
    const ts = Date.now();
    state._lastSavedTs = ts;
    localStorage.setItem('gymrise_emergency', JSON.stringify({
      plans: state.plans,
      screen: state.screen,
      currentDayId: state.currentDayId,
      workout: state.workout,
      history: state.history,
      weights: state.weights,
      lastCompletedTs: state.lastCompletedTs,
      rest: state.rest,
      _lastSavedTs: ts
    }));
  } catch(_) {}
}

window.addEventListener('beforeunload', () => { emergencySave(); flushNow(); });
window.addEventListener('pagehide', () => { emergencySave(); flushNow(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { emergencySave(); flushNow(); }
});

let lastBackPress = 0;
let backHandling = false;
const DOUBLE_BACK_MS = 2000;

function setupBackHandler() {
  try {
    history.replaceState({ gymrise: true }, '');
    history.pushState({ gymrise: true }, '');
  } catch(e) { console.warn('[GymRise] History API недоступен:', e); }

  window.addEventListener('popstate', async () => {
    if (backHandling) return;
    if (handleBack()) {
      try { history.pushState({ gymrise: true }, ''); } catch(_) {}
      return;
    }
    try { history.pushState({ gymrise: true }, ''); } catch(_) {}

    const now = Date.now();
    if (now - lastBackPress < DOUBLE_BACK_MS) {
      lastBackPress = 0;
      const closed = closeApp();
      if (!closed) uiAlert('Закройте приложение через меню устройства');
      return;
    }

    backHandling = true;
    lastBackPress = now;
    const ok = await uiConfirm('Выйти из GymRise?');
    backHandling = false;
    lastBackPress = 0;

    if (ok) {
      const closed = closeApp();
      if (!closed) uiAlert('Закройте приложение через меню устройства');
    }
  });
}

let swReloading = false;
function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(reg => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
    })
    .catch(err => console.log('SW registration failed: ', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloading) return;
    const firstInstall = !navigator.serviceWorker.controller;
    if (firstInstall) return;
    if (state.screen === 'workout' || state.rest) {
      console.log('[GymRise] Обновление готово. Применится после завершения тренировки.');
      return;
    }
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
      console.log('[GymRise] Обновление отложено: пользователь вводит текст');
      return;
    }
    swReloading = true;
    window.location.reload();
  });
}

(async function init() {
  try {
    initBridgeEvents();
    setupBackHandler();

    let loadErr = null;
    const loadPromise = loadState();
    try {
      await Promise.race([
        loadPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('loadState timeout')), 5000))
      ]);
    } catch(e) {
      loadErr = e;
      console.warn('[GymRise] loadState timeout:', e);
    }

    render();

    if (loadErr) {
      loadPromise
        .then(() => {
          console.warn('[GymRise] loadState resolved late, re-rendering');
          render();
        })
        .catch(() => {});
    }

    setupServiceWorkerUpdates();
    window.__GYMPLAN_LOADED = true;
    initDone = true;
  } catch (err) {
    showFatalError(err);
  }
})();

/* © Alexulyanovsk */
