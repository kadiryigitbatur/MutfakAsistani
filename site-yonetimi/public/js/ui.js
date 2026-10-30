// Ortak arayüz yardımcıları: ikonlar, biçimlendirme, modal, form, toast
const ICONS = {
  home: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z',
  wallet: 'M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H5a2 2 0 0 1-2-2zM16 14h2',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4',
  briefcase: 'M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18',
  gavel: 'M14 4l6 6M9 9l6 6M4 20l7-7M12 6l6 6M3 21h7',
  cart: 'M3 3h2l2 12h11l2-8H6M9 20a1 1 0 1 0 0 .1M18 20a1 1 0 1 0 0 .1',
  megaphone: 'M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1zM19 9a4 4 0 0 1 0 6',
  layout: 'M3 4h18v16H3zM3 10h18M10 10v10',
  car: 'M5 11l1.5-5h11L19 11M3 11h18v6h-2M3 17h2M7 17h10M6 14h.1M18 14h.1M5 17v2M19 17v2',
  door: 'M4 21V3h12v18M12 12h.1M4 21h16M16 7h4v14',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  building: 'M4 21V3h10v18M14 9h6v12M7 7h1M7 11h1M7 15h1M17 13h1M17 17h1M4 21h16',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L13 18l-3-3 6.7-8.7zM4 20l3-3',
  badge: 'M4 4h16v16H4zM8 20V4M12 9h5M12 13h5',
  file: 'M6 2h8l5 5v15H6zM14 2v5h5M9 13h6M9 17h6',
  vote: 'M5 11l4 4L19 5M3 21h18M5 13v8M19 13v8',
  tool: 'M12 3l2 2-7 7-2-2zM14 5l5 5-7 7-5-5M3 21l5-5',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  sign: 'M4 20h16M4 16l4-4 3 3 5-5 4 4M14 4l4 4-8 8H6v-4z',
  scale: 'M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  package: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8M7.5 5.5l9 5',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6',
  bag: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  alert: 'M12 3l10 18H2zM12 10v4M12 18h.1',
  chart: 'M3 3v18h18M7 14v4M11 9v9M15 12v6M19 6v12',
  check: 'M5 12l5 5L20 7',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M3 6h18M3 12h18M3 18h18',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  chevron: 'M9 18l6-6-6-6',
  back: 'M15 18l-6-6 6-6',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z',
  clipboard: 'M9 3h6v4H9zM6 5H5a1 1 0 0 0-1 1v15h16V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h6',
  pet: 'M10 5a2 2 0 1 0 0 .1M15 5a2 2 0 1 0 0 .1M5 10a2 2 0 1 0 0 .1M19 10a2 2 0 1 0 0 .1M12 11c-3 0-6 3-6 6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3c0-3-3-6-6-6z',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  star: 'M12 2l3 7 7 .6-5.3 4.6L18.4 21 12 17.3 5.6 21l1.7-6.8L2 9.6 9 9z',
  key: 'M14 3a7 7 0 0 0-6.6 9.3L2 17.7V22h4.3l1-1v-2h2l1-1v-2h2l1.3-1.3A7 7 0 1 0 14 3zM16 8h.1',
  handshake: 'M2 9l4-4 5 2 3-2 4 4 4 1-3 5-4 3-3-1-4 1-3-4z',
  print: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  sparkles: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  bolt: 'M13 2L3 14h8l-1 8 10-12h-8z',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  trending: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z',
  droplet: 'M12 2.7l5.7 6.8a7.5 7.5 0 1 1-11.4 0z',
  flame: 'M12 22a7 7 0 0 0 7-7c0-3-2-5-3-6-1 2-2 3-3 3 0-3-1-6-4-9-1 4-5 7-5 12a7 7 0 0 0 8 7z',
  elevator: 'M4 3h16v18H4zM8 9l2-2 2 2M8 15l2 2 2-2M16 7v10',
  tag: 'M3 12V3h9l9 9-9 9zM8 8h.1',
};
export function icon(name, cls = 'ic') {
  const d = ICONS[name] || ICONS.box;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(n) || 0);
export const num = (n) => new Intl.NumberFormat('tr-TR').format(Number(n) || 0);
export function fmtDate(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthLabel = (p) => { const [y, m] = String(p).split('-'); const d = new Date(Number(y), Number(m) - 1, 1); return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }); };

export function badge(text, tone = '') { return `<span class="badge ${tone}">${esc(text)}</span>`; }
export function statusBadge(value, map) {
  const m = (map && map[value]) || { label: value ?? '—', tone: '' };
  return badge(m.label, m.tone);
}
export function kpi({ label, value, sub = '', tone = '' }) {
  return `<div class="kpi ${tone}"><div class="label">${esc(label)}</div><div class="value">${value}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;
}
export function progress(pct, tone = '') { const p = Math.max(0, Math.min(100, Math.round(pct))); return `<div class="progress ${tone}" title="%${p}"><i style="width:${p}%"></i></div>`; }
export function barChart(items, { fmt = (v) => v } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i) => `<div class="bar"><div class="col"><div class="fill ${i.soft ? 'soft' : ''}" style="height:${Math.max(3, (i.value / max) * 100)}%" title="${esc(fmt(i.value))}"></div></div><div class="lbl">${esc(i.label)}</div></div>`).join('')}</div>`;
}

let toastHost;
export function toast(msg) {
  if (!toastHost) { toastHost = document.createElement('div'); toastHost.className = 'toast-host'; document.body.appendChild(toastHost); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; toastHost.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

export function openModal(title, bodyHTML, { onMount } = {}) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Kapat">${icon('x')}</button></div><div class="modal-body">${bodyHTML}</div></div>`;
  const close = () => { bg.remove(); document.body.style.overflow = ''; };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.body.appendChild(bg); document.body.style.overflow = 'hidden';
  onMount && onMount(bg.querySelector('.modal-body'), close);
  return close;
}

export function renderField(f, value = '') {
  const v = value ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  let input;
  if (f.type === 'select') input = `<select class="input" name="${f.key}" ${req}>${(f.options || []).map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  else if (f.type === 'textarea') input = `<textarea class="input" name="${f.key}" ${req} placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
  else if (f.type === 'checkbox') input = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''}> ${esc(f.hint || 'Evet')}</label>`;
  else input = `<input class="input" type="${f.type || 'text'}" name="${f.key}" value="${esc(v)}" ${req} placeholder="${esc(f.placeholder || '')}" ${f.step ? `step="${f.step}"` : ''}>`;
  return `<div class="field ${f.full || f.type === 'textarea' ? 'full' : ''}"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>${input}</div>`;
}
export function openForm(title, fields, { values = {}, submitLabel = 'Kaydet', onSubmit }) {
  const html = `<form class="form">${fields.map((f) => renderField(f, values[f.key])).join('')}<div class="form-actions"><button type="button" class="btn" data-close>Vazgeç</button><button type="submit" class="btn primary">${esc(submitLabel)}</button></div></form>`;
  return openModal(title, html, {
    onMount(body, close) {
      body.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target); const data = {};
        for (const f of fields) {
          let v = fd.get(f.key);
          if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
          else if (f.type === 'checkbox') v = fd.get(f.key) === 'on';
          data[f.key] = v;
        }
        await onSubmit(data, close);
      });
    },
  });
}

export function confirmDialog(text, onYes) {
  openModal('Onay', `<p>${esc(text)}</p><div class="form-actions" style="margin-top:14px"><button class="btn" data-close>Vazgeç</button><button class="btn primary" data-yes>Evet</button></div>`, {
    onMount(body, close) { body.querySelector('[data-yes]').onclick = async () => { await onYes(); close(); }; },
  });
}

export function detailList(pairs) {
  return `<div class="detail"><dl>${pairs.filter((p) => p).map(([k, v, full]) => `<div class="${full ? 'full' : ''}"><dt>${esc(k)}</dt><dd>${v ?? '—'}</dd></div>`).join('')}</dl></div>`;
}
