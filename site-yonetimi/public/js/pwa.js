// PWA: service worker kaydı ve "ana ekrana ekle / masaüstüne yükle" istemi
import { icon } from './ui.js';
let deferred = null; let banner = null;
const DISMISS_KEY = 'sy_install_dismissed';

export function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW kaydı başarısız', e)));
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    let dismissed = 0; try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch {}
    if (Date.now() - dismissed > 3 * 24 * 3600 * 1000) showBanner();
  });
  window.addEventListener('appinstalled', () => { hideBanner(); deferred = null; });
}
function showBanner() {
  if (banner || matchMedia('(display-mode: standalone)').matches) return;
  banner = document.createElement('div'); banner.className = 'install-banner';
  banner.innerHTML = `<div class="logo">SY</div><div class="txt"><b>Uygulamayı yükle</b>Masaüstüne / ana ekrana kısayol eklenir, tam ekran açılır.</div><button class="btn primary sm" data-i>Yükle</button><button class="icon-btn" data-x aria-label="Kapat">${icon('x')}</button>`;
  banner.querySelector('[data-i]').onclick = promptInstall;
  banner.querySelector('[data-x]').onclick = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {} hideBanner(); };
  document.body.appendChild(banner);
}
function hideBanner() { banner?.remove(); banner = null; }
export async function promptInstall() {
  if (deferred) { deferred.prompt(); const { outcome } = await deferred.userChoice; if (outcome === 'accepted') hideBanner(); deferred = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const msg = matchMedia('(display-mode: standalone)').matches ? 'Uygulama zaten yüklü.' : ios ? 'iPhone/iPad: Safari\'de Paylaş simgesine dokunun → "Ana Ekrana Ekle".' : 'Tarayıcı adres çubuğundaki "Yükle" simgesini ya da menüden "Uygulamayı yükle"yi kullanın.';
  alert(msg);
}
