/**
 * GymRise
 * Файл: js/boot.js
 * Автор и правообладатель: © Alexulyanovsk
 */

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.__GYMPLAN_LOADED) {
      console.warn('[GymRise] Не загрузилось за 10с.');
      const app = document.getElementById('app');
      
      if (!navigator.onLine) {
        if (app) app.innerHTML = '<div class="empty" style="color:#FF6B6B;">Нет соединения. Проверьте интернет.</div>';
        return;
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (let reg of regs) reg.unregister();
        });
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          Promise.all(keys.map(k => caches.delete(k))).then(() => location.reload());
        });
      } else {
        location.reload();
      }
    }
  }, 10000);
});

/* © Alexulyanovsk */
