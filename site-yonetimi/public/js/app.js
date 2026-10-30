// Uygulama kabuğu: oturum, yönlendirme, menü, genel modül sayfası
import { icon, esc, kpi, money, fmtDate, fmtDateTime, toast, openForm, openModal, detailList, badge, statusBadge } from './ui.js';
import { MODULES, STATUS, GROUP_ORDER, RESIDENT_GROUPS, RESIDENT_GROUP_ORDER, modulesFor, byId, unitLabel } from './modules.js';
import { VIEWS } from './views.js';
import { createStore, DEMO_USERS, signInWithEmail, currentFirebaseUser, signOutFirebase } from './store.js';
import { firebaseEnabled } from './firebase.js';
import { setupPWA, promptInstall } from './pwa.js';

const app = document.getElementById('app');
const S = { me: null, store: null, site: null, portal: 'admin', current: null, state: {}, cache: {} };
const SESSION_KEY = 'sy_session';
const TAB_LABELS = { 'ana-sayfa': 'Ana sayfa', aidatim: 'Aidat', talepler: 'Talepler', duyurular: 'Duyurular', mesajlar: 'Mesajlar', panel: 'Panel', aidat: 'Aidat', otopark: 'Otopark', 'giris-cikis': 'Giriş-çıkış', ziyaretciler: 'Misafir', kargo: 'Kargo' };

function setTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; try { localStorage.setItem('sy_theme', t || ''); } catch {} }
try { const t = localStorage.getItem('sy_theme'); if (t) setTheme(t); } catch {}

// ---------- Giriş ----------
function renderLogin() {
  app.innerHTML = `<div class="login"><div class="card">
    <div class="brand" style="padding:0 0 10px"><div class="logo">SY</div><div><b>Site Yönetimi</b><span>Yönetim ve sakin portalı</span></div></div>
    ${firebaseEnabled ? `<form data-login class="form" style="grid-template-columns:1fr"><div class="field"><label>E-posta</label><input class="input" name="email" type="email" required></div><div class="field"><label>Şifre</label><input class="input" name="password" type="password" required></div><div class="form-actions"><button class="btn primary block">Giriş yap</button></div></form><p class="small muted" style="margin-top:10px">Hesabınız yoksa site yönetiminizden davet isteyin.</p>`
      : `<p class="muted small">Demo modu: sunucu bağlantısı yok, veriler bu tarayıcıda tutulur. Göstermek istediğiniz tarafı seçin.</p>
      <div class="role-pick">
        <button data-role="admin">${icon('briefcase')}<div><b>Site Yönetimi</b><span>Aidat, projeler, ihaleler, güvenlik, reklam, raporlar</span></div></button>
        <button data-role="resident">${icon('home')}<div><b>Sakin</b><span>Borçlarım, talepler, misafir, kargo, rezervasyon, anketler</span></div></button>
        <button data-role="security">${icon('shield')}<div><b>Güvenlik görevlisi</b><span>Giriş-çıkış, misafir doğrulama, kargo, otopark</span></div></button>
      </div>`}
    <p class="small muted" style="margin-top:16px;text-align:center">Yeşil Vadi Sitesi · 4 blok · 96 daire (örnek veri)</p>
  </div></div>`;
  app.querySelectorAll('[data-role]').forEach((b) => b.onclick = () => startSession(DEMO_USERS[b.dataset.role]));
  app.querySelector('[data-login]')?.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(e.target); try { const me = await signInWithEmail(fd.get('email'), fd.get('password')); startSession(me); } catch (err) { toast('Giriş başarısız: ' + (err.code || err.message)); } });
}

async function startSession(me) {
  S.me = me; S.portal = me.role === 'resident' ? 'resident' : 'admin';
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(me)); } catch {}
  S.store = await createStore(me.siteId); S.site = await S.store.site();
  S.store.onChange(() => { S.cache = {}; });
  if (!location.hash || location.hash === '#/') location.hash = S.portal === 'resident' ? '#/ana-sayfa' : '#/panel';
  renderShell(); route();
}
async function logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} if (firebaseEnabled) await signOutFirebase(); S.me = null; location.hash = ''; renderLogin(); }

// ---------- Kabuk ----------
function navItems() {
  const mods = modulesFor(S.portal);
  if (S.me.role === 'security') return mods.filter((m) => ['panel', 'giris-cikis', 'ziyaretciler', 'kargo', 'otopark', 'talepler', 'kayip-esya', 'duyurular', 'ayarlar'].includes(m.id));
  return mods;
}
function groupOf(m) { return S.portal === 'resident' ? RESIDENT_GROUPS[m.id] || 'Genel' : m.group; }
function titleOf(m) { return S.portal === 'resident' ? m.residentTitle || m.title : m.title; }
function renderShell() {
  const mods = navItems(); const order = S.portal === 'resident' ? RESIDENT_GROUP_ORDER : GROUP_ORDER;
  const groups = order.filter((g) => mods.some((m) => groupOf(m) === g));
  const tabs = S.portal === 'resident' ? ['ana-sayfa', 'aidatim', 'talepler', 'duyurular', 'mesajlar'] : S.me.role === 'security' ? ['panel', 'giris-cikis', 'ziyaretciler', 'kargo', 'otopark'] : ['panel', 'aidat', 'talepler', 'duyurular', 'otopark'];
  app.innerHTML = `<div class="shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="logo">SY</div><div><b>${esc(S.site.name)}</b><span>${S.portal === 'resident' ? 'Sakin portalı' : 'Yönetim portalı'}</span></div></div>
      ${groups.map((g) => `<div class="nav-group">${esc(g)}</div>${mods.filter((m) => groupOf(m) === g).map((m) => `<button class="nav-item" data-nav="${m.id}">${icon(m.icon)}<span>${esc(titleOf(m))}</span></button>`).join('')}`).join('')}
      <div class="sidebar-foot"><div class="small" style="padding:4px 8px"><b>${esc(S.me.name)}</b><br><span class="muted">${esc(S.me.roleLabel)}${S.me.unitId ? ' · ' + unitLabel(S.me.unitId) : ''}</span></div>
        ${!firebaseEnabled ? `<button class="nav-item" data-switch>${icon('refresh')}<span>Portal değiştir (demo)</span></button>` : ''}
        <button class="nav-item" data-logout>${icon('logout')}<span>Çıkış</span></button></div>
    </aside>
    <div class="sidebar-bg" id="sidebar-bg" hidden></div>
    <div class="main">
      <header class="topbar"><button class="icon-btn menu-btn" data-menu aria-label="Menü">${icon('menu')}</button><div class="title" id="topbar-title"></div>
        ${S.store.mode === 'demo' ? badge('DEMO', 'warn') : ''}
        <button class="icon-btn" data-theme-toggle aria-label="Tema">${icon('moon')}</button>
        <button class="icon-btn" data-notif aria-label="Bildirimler">${icon('bell')}<span class="dot"></span></button></header>
      <main class="content" id="content"></main>
    </div>
    <nav class="tabbar">${tabs.map((id) => byId(id)).filter(Boolean).map((m) => `<button data-nav="${m.id}">${icon(m.icon)}<span>${esc(TAB_LABELS[m.id] || titleOf(m))}</span></button>`).join('')}</nav>
  </div>`;
  app.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { navigate(b.dataset.nav); closeMenu(); });
  app.querySelector('[data-menu]').onclick = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-bg').hidden = false; };
  app.querySelector('#sidebar-bg').onclick = closeMenu;
  app.querySelector('[data-logout]').onclick = logout;
  app.querySelector('[data-switch]')?.addEventListener('click', () => { const next = S.portal === 'resident' ? DEMO_USERS.admin : DEMO_USERS.resident; location.hash = ''; startSession(next); });
  app.querySelector('[data-theme-toggle]').onclick = () => { const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark ? 'light' : 'dark'); };
  app.querySelector('[data-notif]').onclick = showNotifications;
}
function closeMenu() { document.getElementById('sidebar')?.classList.remove('open'); const bg = document.getElementById('sidebar-bg'); if (bg) bg.hidden = true; }
function navigate(id) { location.hash = '#/' + id; }
async function showNotifications() {
  const n = await S.store.list('notifications');
  const mine = S.portal === 'resident' ? n.filter((x) => x.unitId === S.me.unitId) : [{ title: '3 rezervasyon onay bekliyor', body: 'Ortak alanlar', at: new Date().toISOString() }, { title: 'Jeneratör yük testi gecikti', body: 'Periyodik bakım', at: new Date().toISOString() }, { title: 'Yeni teklif: Nova Facility', body: 'Temizlik ihalesi', at: new Date().toISOString() }];
  openModal('Bildirimler', `<div class="feed">${mine.map((x) => `<div class="feed-item"><div class="ico">${icon('bell')}</div><div><b class="small">${esc(x.title)}</b><div class="small muted">${esc(x.body)} · ${fmtDateTime(x.at)}</div></div></div>`).join('') || '<p class="muted">Bildirim yok</p>'}</div>`);
}

// ---------- Yönlendirme ----------
window.addEventListener('hashchange', route);
async function route() {
  if (!S.me) return;
  const id = (location.hash.replace(/^#\//, '') || '').split('?')[0];
  const mods = navItems(); const m = mods.find((x) => x.id === id) || mods[0];
  if (m.id !== id) { location.hash = '#/' + m.id; return; }
  if (S.current !== m.id) S.state = {}; S.current = m.id;
  app.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === m.id));
  document.getElementById('topbar-title').textContent = titleOf(m);
  document.title = `${titleOf(m)} · ${S.site.name}`;
  const content = document.getElementById('content'); content.innerHTML = '<div class="empty">Yükleniyor…</div>';
  const ctx = makeCtx();
  await ensureLookups();
  try {
    const page = m.view ? await VIEWS[m.view](ctx) : await genericModule(m, ctx);
    const desc = S.portal === 'resident' ? m.residentDesc || m.desc : m.desc;
    content.innerHTML = `<div class="page-head"><div><h1>${esc(titleOf(m))}</h1><p>${esc(desc || '')}</p></div><div class="page-actions" id="page-actions"></div></div><div id="page"></div>`;
    const el = content.querySelector('#page'); el.innerHTML = page.html; page.mount && page.mount(el, content.querySelector('#page-actions'));
    window.scrollTo(0, 0);
  } catch (e) { console.error(e); content.innerHTML = `<div class="card"><b>Sayfa yüklenemedi</b><p class="small muted">${esc(e.message)}</p></div>`; }
}
async function ensureLookups() { S.lk = { areas: await S.store.list('commonAreas'), ads: await S.store.list('adSpaces') }; }
function makeCtx() {
  return { store: S.store, me: S.me, site: S.site, portal: S.portal, state: S.state, navigate, refresh: route, setTheme, install: promptInstall,
    areaName: (id) => S.lk?.areas.find((a) => a.id === id)?.name || id || '—', adSpaceName: (id) => S.lk?.ads.find((a) => a.id === id)?.name || id || '—' };
}

// ---------- Genel modül sayfası ----------
async function genericModule(m, ctx) {
  const isResident = S.portal === 'resident'; const isSecurity = S.me.role === 'security';
  let rows = await S.store.list(m.collection);
  if (isResident && m.unitScoped) rows = rows.filter((r) => r.unitId === S.me.unitId);
  if (isResident && m.residentFilter) rows = rows.filter(m.residentFilter);
  const canCreate = isResident ? !m.residentReadOnly : !(isSecurity && !m.staffCanWrite && !['talepler', 'kayip-esya'].includes(m.id));
  const actions = isResident ? m.residentActions || [] : m.actions || [];
  const fields = [...(m.fields || []), ...(!isResident ? m.adminFields || [] : [])].map((f) => (f.optionsFrom ? { ...f, options: (f.optionsFrom === 'commonAreas' ? S.lk.areas : S.lk.ads).map((a) => [a.id, a.name]) } : f));
  let q = ''; let filter = '';
  const cols = m.columns || [];
  const cell = (c, r) => { const [key, , fn, cls] = c; const v = r[key]; return `<td class="${cls || ''}">${fn ? fn(v, ctx, r) : esc(v ?? '—')}</td>`; };
  const render = () => {
    const list = rows.filter((r) => (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) && (!filter || String(r[m.filters.key]) === filter));
    const k = m.kpis ? m.kpis(rows) : [];
    return `${k.length ? `<div class="kpis">${k.map(kpi).join('')}</div>` : ''}
    <div class="toolbar"><input class="input search" placeholder="Ara…" data-q value="${esc(q)}">${m.filters ? `<div class="chips"><button class="chip ${!filter ? 'active' : ''}" data-f="">Tümü</button>${m.filters.options.map(([v, l]) => `<button class="chip ${filter === v ? 'active' : ''}" data-f="${v}">${esc(l)}</button>`).join('')}</div>` : ''}${canCreate ? `<button class="btn primary" data-new>${icon('plus')} Yeni</button>` : ''}</div>
    ${m.residentCard || isResident ? '' : `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th class="${c[3] || ''}">${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${list.map((r) => `<tr data-id="${r.id}">${cols.map((c) => cell(c, r)).join('')}</tr>`).join('')}</tbody></table>${list.length ? '' : '<div class="empty">Kayıt bulunamadı</div>'}</div>`}
    <div class="list-cards" ${m.residentCard || isResident ? 'style="display:grid"' : ''}>${list.map((r) => { const [t, ...rest] = cols; const statusCol = cols.find((c) => c[0] === m.statusKey); return `<div class="item-card" data-id="${r.id}"><div class="row"><span class="title">${t[2] ? t[2](r[t[0]], ctx, r) : esc(r[t[0]])}</span>${statusCol ? statusCol[2](r[statusCol[0]], ctx, r) : ''}</div><div class="row small muted"><span>${rest.filter((c) => c[0] !== m.statusKey).slice(0, 2).map((c) => (c[2] ? c[2](r[c[0]], ctx, r) : esc(r[c[0]] ?? ''))).join(' · ')}</span><span>${rest.filter((c) => c[0] !== m.statusKey).slice(2, 3).map((c) => (c[2] ? c[2](r[c[0]], ctx, r) : esc(r[c[0]] ?? ''))).join('')}</span></div>${r.body || r.summary || r.description ? `<div class="small">${esc((r.body || r.summary || r.description).slice(0, 140))}</div>` : ''}</div>`; }).join('')}${list.length ? '' : '<div class="empty">Kayıt bulunamadı</div>'}</div>`;
  };
  const mount = (el) => {
    const re = () => { el.innerHTML = render(); mount(el); };
    const qi = el.querySelector('[data-q]'); qi.oninput = () => { q = qi.value; const p = qi.selectionStart; re(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(p, p); };
    el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; re(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => openForm(`Yeni: ${titleOf(m)}`, fields, { async onSubmit(v, close) { let doc = v; if (isResident && (m.unitScoped || m.residentOwnsNew)) doc.unitId = S.me.unitId; if (m.onCreate) doc = m.onCreate(doc); if (m.statusKey && doc[m.statusKey] == null) doc[m.statusKey] = Object.keys(STATUS[m.statusMap])[0]; await S.store.add(m.collection, doc); close(); toast('Kaydedildi'); route(); } }));
    el.querySelectorAll('[data-id]').forEach((tr) => tr.onclick = () => openDetail(m, rows.find((r) => r.id === tr.dataset.id), ctx, { fields, actions, isResident }));
  };
  return { html: render(), mount };
}

async function openDetail(m, r, ctx, { fields, actions, isResident }) {
  const cols = m.columns || [];
  const pairs = cols.map((c) => [c[1], c[2] ? c[2](r[c[0]], ctx, r) : esc(r[c[0]] ?? '—')]);
  for (const k of ['body', 'description', 'summary', 'agenda', 'rules', 'note']) if (r[k]) pairs.push([{ body: 'Metin', description: 'Açıklama', summary: 'Özet', agenda: 'Gündem', rules: 'Kurallar', note: 'Not' }[k], esc(r[k]), true]);
  let extra = '';
  if (m.detailExtra === 'bids') { const bids = (await S.store.list('bids')).filter((b) => b.tenderId === r.id); extra = `<h3 style="margin:16px 0 8px">Teklifler (${bids.length})</h3><div class="timeline">${bids.sort((a, b) => a.amount - b.amount).map((b) => `<div class="tl"><span class="mono">${money(b.amount)}</span><span><b>${esc(b.company)}</b> · teknik puan ${b.score}</span></div>`).join('') || '<p class="muted small">Henüz teklif yok</p>'}</div>`; }
  if (m.detailExtra === 'areas') { const a = S.lk.areas.find((x) => x.id === r.areaId); if (a) extra = `<p class="small muted" style="margin-top:12px"><b>${esc(a.name)}</b> · kapasite ${a.capacity} · ${a.hourlyPrice ? money(a.hourlyPrice) + '/saat' : 'ücretsiz'}${a.deposit ? ' · depozito ' + money(a.deposit) : ''}<br>${esc(a.rules)}</p>`; }
  const acts = actions.filter((a) => !a.when || a.when(r, S.me));
  const canEdit = !isResident || (m.unitScoped && !m.residentReadOnly);
  openModal(titleOf(m), `${detailList(pairs)}${extra}<div class="form-actions" style="margin-top:16px;flex-wrap:wrap">${acts.map((a, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="${i}">${esc(a.label)}</button>`).join('')}${canEdit ? `<button class="btn" data-edit>${icon('edit')} Düzenle</button>` : ''}${!isResident && S.me.role !== 'security' ? `<button class="btn danger" data-del>${icon('trash')}</button>` : ''}</div>`, {
    onMount(body, close) {
      body.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => { await S.store.update(m.collection, r.id, acts[b.dataset.act].patch); close(); toast('Güncellendi'); route(); });
      body.querySelector('[data-edit]')?.addEventListener('click', () => { close(); openForm(`Düzenle: ${titleOf(m)}`, fields, { values: r, async onSubmit(v, c2) { await S.store.update(m.collection, r.id, v); c2(); toast('Kaydedildi'); route(); } }); });
      body.querySelector('[data-del]')?.addEventListener('click', async () => { if (confirm('Kayıt silinsin mi?')) { await S.store.remove(m.collection, r.id); close(); toast('Silindi'); route(); } });
    },
  });
}

// ---------- Başlat ----------
(async function init() {
  setupPWA();
  if (firebaseEnabled) { const u = await currentFirebaseUser().catch(() => null); if (u) return startSession(u); return renderLogin(); }
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); if (s && DEMO_USERS[s.role === 'resident' ? 'resident' : s.role === 'security' ? 'security' : 'admin']) return startSession(s); } catch {}
  renderLogin();
})();
