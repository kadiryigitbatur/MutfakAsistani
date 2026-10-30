// Özel görünümler: panel, aidat, otopark, anketler, mesajlar, mutabakat, ayarlar...
import { icon, esc, money, num, fmtDate, fmtDateTime, kpi, badge, progress, barChart, toast, openForm, openModal, confirmDialog, monthLabel, detailList } from './ui.js';
import { STATUS, MODULES, modulesFor, unitLabel } from './modules.js';

const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const thisPeriod = () => new Date().toISOString().slice(0, 7);
const sb = (map, v) => { const m = STATUS[map][v] || { label: v, tone: '' }; return badge(m.label, m.tone); };

// ---------- YÖNETİM PANELİ ----------
export async function adminDashboard(ctx) {
  const [dues, tickets, access, spots, ann, res, projects, deliveries, visitors, maint, contracts, charges] = await Promise.all(['dues', 'tickets', 'accessLog', 'parkingSpots', 'announcements', 'reservations', 'projects', 'deliveries', 'visitors', 'maintenanceTasks', 'contracts', 'extraCharges'].map((c) => ctx.store.list(c)));
  const p = thisPeriod(); const cur = dues.filter((d) => d.period === p);
  const expected = sum(cur, 'amount'), collected = sum(cur, 'paidAmount'); const rate = expected ? Math.round((collected / expected) * 100) : 0;
  const debtors = new Set(dues.filter((d) => d.status !== 'paid').map((d) => d.unitId)).size;
  const totalDebt = sum(dues.filter((d) => d.status !== 'paid'), 'amount') - sum(dues.filter((d) => d.status !== 'paid'), 'paidAmount') + sum(charges.filter((c) => c.status === 'open'), 'amount');
  const today = new Date().toDateString(); const todayAccess = access.filter((a) => new Date(a.at).toDateString() === today);
  const occ = spots.filter((s) => s.status === 'occupied').length;
  const periods = [...new Set(dues.map((d) => d.period))].sort().slice(-6);
  const chart = periods.map((pp) => { const r = dues.filter((d) => d.period === pp); return { label: monthLabel(pp).split(' ')[0].slice(0, 3), value: Math.round((sum(r, 'paidAmount') / Math.max(1, sum(r, 'amount'))) * 100) }; });
  const openTickets = tickets.filter((t) => t.status !== 'done' && t.status !== 'closed');
  const upcoming = res.filter((r) => r.status !== 'rejected' && r.status !== 'cancelled' && new Date(r.startsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 4);
  const alerts = [
    ...maint.filter((m) => m.status === 'overdue' || m.status === 'due').map((m) => ({ tone: m.status === 'overdue' ? 'danger' : 'warn', text: `${m.title} — ${m.status === 'overdue' ? 'gecikti' : 'zamanı geldi'} (${fmtDate(m.nextDate)})`, go: 'bakim' })),
    ...contracts.filter((c) => c.status === 'expiring').map((c) => ({ tone: 'warn', text: `${c.title} sözleşmesi ${fmtDate(c.end)} tarihinde bitiyor`, go: 'sozlesmeler' })),
    ...openTickets.filter((t) => t.priority === 'high').map((t) => ({ tone: 'danger', text: `Yüksek öncelikli talep: ${t.title} (${unitLabel(t.unitId)})`, go: 'talepler' })),
    ...(res.some((r) => r.status === 'pending') ? [{ tone: 'info', text: `${res.filter((r) => r.status === 'pending').length} rezervasyon onay bekliyor`, go: 'ortak-alanlar' }] : []),
    ...(deliveries.some((d) => d.status === 'at_desk') ? [{ tone: 'info', text: `${deliveries.filter((d) => d.status === 'at_desk').length} kargo güvenlikte teslim bekliyor`, go: 'kargo' }] : []),
  ];
  const html = `
  <div class="kpis">
    ${kpi({ label: `${monthLabel(p)} tahsilat oranı`, value: `%${rate}`, sub: `${money(collected)} / ${money(expected)}`, tone: rate >= 80 ? 'ok' : rate >= 60 ? 'warn' : 'danger' })}
    ${kpi({ label: 'Toplam alacak', value: money(totalDebt), sub: `${debtors} borçlu daire`, tone: 'danger' })}
    ${kpi({ label: 'Açık talep / arıza', value: openTickets.length, sub: `${openTickets.filter((t) => t.priority === 'high').length} yüksek öncelik`, tone: 'warn' })}
    ${kpi({ label: 'Bugün giriş-çıkış', value: todayAccess.length, sub: `${todayAccess.filter((a) => a.kind === 'visitor').length} ziyaretçi, ${todayAccess.filter((a) => a.kind === 'courier').length} kurye` })}
    ${kpi({ label: 'Otopark doluluk', value: `%${Math.round((occ / Math.max(1, spots.length)) * 100)}`, sub: `${occ} / ${spots.length} yer dolu`, tone: 'primary' })}
    ${kpi({ label: 'Beklenen misafir', value: visitors.filter((v) => v.status === 'expected').length, sub: 'Bugün ve sonrası' })}
  </div>
  <div class="grid cols-3">
    <div class="card" style="grid-column: span 2">
      <div class="card-head"><h2>Aidat tahsilat oranı (son 6 ay)</h2><button class="btn sm" data-go="aidat">Aidat takibi ${icon('chevron')}</button></div>
      ${barChart(chart, { fmt: (v) => `%${v}` })}
    </div>
    <div class="card">
      <div class="card-head"><h2>Uyarılar</h2>${badge(`${alerts.length}`, alerts.length ? 'danger' : 'ok')}</div>
      <div class="feed">${alerts.length ? alerts.slice(0, 6).map((a) => `<div class="feed-item" data-go="${a.go}" style="cursor:pointer"><div class="ico" style="background:var(--${a.tone}-soft);color:var(--${a.tone})">${icon('alert')}</div><div class="small">${esc(a.text)}</div></div>`).join('') : '<p class="muted">Bekleyen uyarı yok.</p>'}</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Projeler</h2><button class="btn sm" data-go="projeler">Tümü</button></div>
      ${projects.filter((x) => x.status === 'active').map((x) => `<div style="margin-bottom:12px"><div class="row" style="display:flex;justify-content:space-between;gap:8px"><b class="small">${esc(x.title)}</b><span class="small muted">%${x.progress}</span></div>${progress(x.progress)}<div class="small muted">${money(x.spent)} / ${money(x.budget)}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-head"><h2>Yaklaşan rezervasyonlar</h2><button class="btn sm" data-go="ortak-alanlar">Takvim</button></div>
      <div class="timeline">${upcoming.map((r) => `<div class="tl"><span class="muted small">${fmtDateTime(r.startsAt)}</span><span><b>${esc(ctx.areaName(r.areaId))}</b><br><span class="small muted">${esc(r.title)} · ${unitLabel(r.unitId)}</span> ${sb('reservation', r.status)}</span></div>`).join('') || '<p class="muted">Yaklaşan rezervasyon yok.</p>'}</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Son duyurular</h2><button class="btn sm" data-go="duyurular">Yeni ${icon('plus')}</button></div>
      <div class="feed">${ann.filter((a) => a.isPublished).slice(0, 4).map((a) => `<div class="feed-item"><div class="ico">${icon('bell')}</div><div><b class="small">${esc(a.title)}</b><div class="small muted">${fmtDateTime(a.publishedAt)}${a.pinned ? ' · sabit' : ''}</div></div></div>`).join('')}</div>
    </div>
  </div>`;
  return { html, mount: (el) => el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ctx.navigate(b.dataset.go))) };
}

// ---------- SAKİN ANA SAYFA ----------
export async function residentHome(ctx) {
  const u = ctx.me.unitId;
  const [dues, charges, ann, deliveries, visitors, tickets, res, polls, notes, spots] = await Promise.all(['dues', 'extraCharges', 'announcements', 'deliveries', 'visitors', 'tickets', 'reservations', 'polls', 'notifications', 'parkingSpots'].map((c) => ctx.store.list(c)));
  const myDues = dues.filter((d) => d.unitId === u && d.status !== 'paid'); const myCharges = charges.filter((c) => c.unitId === u && c.status === 'open');
  const debt = sum(myDues, 'amount') - sum(myDues, 'paidAmount') + sum(myCharges, 'amount');
  const unit = await ctx.store.get('units', u);
  const mySpot = spots.find((s) => s.unitId === u);
  const quick = [['talepler', 'wrench', 'Arıza bildir'], ['ziyaretciler', 'userplus', 'Misafir bildir'], ['ortak-alanlar', 'calendar', 'Rezervasyon'], ['aidatim', 'wallet', 'Aidat öde'], ['mesajlar', 'message', 'Yönetime yaz'], ['acil', 'phone', 'Acil hat']];
  const html = `
  <div class="card" style="background:linear-gradient(135deg,var(--primary),#2b4bd6);color:#fff;border:0">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
      <div><div class="small" style="opacity:.85">${esc(unitLabel(u))} · ${esc(unit?.type || '')} · ${esc(ctx.me.name)}</div>
      <div style="font-size:1.7rem;font-weight:800;margin-top:4px">${debt > 0 ? money(debt) : 'Borcunuz yok'}</div>
      <div class="small" style="opacity:.85">${debt > 0 ? `${myDues.length} aidat + ${myCharges.length} ek ücret bekliyor` : 'Tüm ödemeleriniz tamam, teşekkürler'}</div></div>
      ${debt > 0 ? `<button class="btn" data-go="aidatim" style="background:#fff;color:var(--primary);border:0">${icon('wallet')} Şimdi öde</button>` : ''}
    </div>
  </div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>Hızlı işlemler</h2></div>
    <div class="quick">${quick.map(([go, ic, lab]) => `<button data-go="${go}">${icon(ic)}${esc(lab)}</button>`).join('')}</div></div>
  <div class="grid cols-2" style="margin-top:14px">
    <div class="card"><div class="card-head"><h2>Bildirimler</h2>${badge(`${notes.filter((n) => n.unitId === u && !n.read).length} yeni`, 'primary')}</div>
      <div class="feed">${notes.filter((n) => n.unitId === u).map((n) => `<div class="feed-item"><div class="ico">${icon(n.title.includes('Kargo') ? 'package' : n.title.includes('Rezerv') ? 'calendar' : 'wrench')}</div><div><b class="small">${esc(n.title)}</b><div class="small muted">${esc(n.body)} · ${fmtDateTime(n.at)}</div></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>Duyurular</h2><button class="btn sm" data-go="duyurular">Tümü</button></div>
      <div class="feed">${ann.filter((a) => a.isPublished).slice(0, 4).map((a) => `<div class="feed-item"><div class="ico">${icon('bell')}</div><div><b class="small">${esc(a.title)}</b>${a.pinned ? ' ' + badge('Önemli', 'danger') : ''}<div class="small muted">${esc(a.body).slice(0, 90)}… · ${fmtDate(a.publishedAt)}</div></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><h2>Bugün</h2></div>
      <div class="feed">
        ${deliveries.filter((d) => d.unitId === u && d.status === 'at_desk').map((d) => `<div class="feed-item" data-go="kargo"><div class="ico" style="background:var(--warn-soft);color:var(--warn)">${icon('package')}</div><div><b class="small">Kargonuz güvenlikte</b><div class="small muted">${esc(d.carrier)} · ${esc(d.code)}</div></div></div>`).join('')}
        ${visitors.filter((v) => v.unitId === u && v.status === 'expected').map((v) => `<div class="feed-item" data-go="ziyaretciler"><div class="ico">${icon('userplus')}</div><div><b class="small">Misafir: ${esc(v.name)}</b><div class="small muted">${fmtDateTime(v.expectedAt)} · Kod ${v.code}</div></div></div>`).join('')}
        ${res.filter((r) => r.unitId === u && r.status === 'approved' && new Date(r.startsAt) > new Date()).map((r) => `<div class="feed-item" data-go="ortak-alanlar"><div class="ico" style="background:var(--ok-soft);color:var(--ok)">${icon('calendar')}</div><div><b class="small">${esc(ctx.areaName(r.areaId))}</b><div class="small muted">${fmtDateTime(r.startsAt)} · ${esc(r.title)}</div></div></div>`).join('')}
        ${tickets.filter((t) => t.unitId === u && t.status !== 'done').map((t) => `<div class="feed-item" data-go="talepler"><div class="ico">${icon('wrench')}</div><div><b class="small">${esc(t.title)}</b><div class="small muted">${sb('ticket', t.status)}</div></div></div>`).join('')}
      </div></div>
    <div class="card"><div class="card-head"><h2>Otopark & anket</h2></div>
      <div class="feed">
        <div class="feed-item" data-go="otopark"><div class="ico">${icon('car')}</div><div><b class="small">Park yeriniz: ${esc(mySpot?.id || 'Tanımlı değil')}</b><div class="small muted">${mySpot ? `${mySpot.zone} · ${sb('parking', mySpot.status)}` : ''} · Misafir otoparkı: ${spots.filter((s) => s.kind === 'guest' && s.status === 'free').length} boş</div></div></div>
        ${polls.filter((p) => p.status === 'open').map((p) => `<div class="feed-item" data-go="anketler"><div class="ico">${icon('vote')}</div><div><b class="small">${esc(p.title)}</b><div class="small muted">Oylama ${fmtDate(p.endsAt)} tarihine kadar açık</div></div></div>`).join('')}
      </div></div>
  </div>`;
  return { html, mount: (el) => el.querySelectorAll('[data-go]').forEach((b) => { b.style.cursor = 'pointer'; b.addEventListener('click', () => ctx.navigate(b.dataset.go)); }) };
}

// ---------- AİDAT (YÖNETİM) ----------
export async function aidat(ctx) {
  const [dues, units] = await Promise.all([ctx.store.list('dues'), ctx.store.list('units')]);
  const periods = [...new Set(dues.map((d) => d.period))].sort().reverse();
  let period = ctx.state.period || periods[0]; let onlyDebt = ctx.state.onlyDebt || false; let q = '';
  const render = () => {
    const rows = dues.filter((d) => d.period === period && (!onlyDebt || d.status !== 'paid') && (!q || d.unitId.toLowerCase().includes(q.toLowerCase())));
    const all = dues.filter((d) => d.period === period);
    const expected = sum(all, 'amount'), collected = sum(all, 'paidAmount');
    const unitDebt = (uid) => { const x = dues.filter((d) => d.unitId === uid && d.status !== 'paid'); return sum(x, 'amount') - sum(x, 'paidAmount'); };
    return `
    <div class="kpis">
      ${kpi({ label: 'Tahakkuk', value: money(expected), sub: `${all.length} daire` })}
      ${kpi({ label: 'Tahsil edilen', value: money(collected), sub: `%${Math.round((collected / Math.max(1, expected)) * 100)}`, tone: 'ok' })}
      ${kpi({ label: 'Kalan', value: money(expected - collected), sub: `${all.filter((d) => d.status !== 'paid').length} daire ödemedi`, tone: 'danger' })}
      ${kpi({ label: 'Dönem', value: monthLabel(period), sub: 'Son ödeme: her ayın 10\'u' })}
    </div>
    <div class="toolbar">
      <select class="input" style="width:auto" data-period>${periods.map((p) => `<option value="${p}" ${p === period ? 'selected' : ''}>${monthLabel(p)}</option>`).join('')}</select>
      <input class="input search" placeholder="Daire ara (A-12)" data-q value="${esc(q)}">
      <button class="chip ${onlyDebt ? 'active' : ''}" data-debt>Sadece borçlular</button>
      <button class="btn" data-remind>${icon('bell')} Borçlulara hatırlatma</button>
      <button class="btn primary" data-bulk>${icon('plus')} Toplu tahakkuk</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Daire</th><th>Oturan</th><th class="num">Aidat</th><th class="num">Ödenen</th><th class="num">Toplam borç</th><th>Son ödeme</th><th>Durum</th></tr></thead><tbody>
      ${rows.map((d) => { const u = units.find((x) => x.id === d.unitId) || {}; return `<tr data-id="${d.id}"><td><b>${unitLabel(d.unitId)}</b></td><td>${esc(u.residentName || '—')}</td><td class="num">${money(d.amount)}</td><td class="num">${money(d.paidAmount)}</td><td class="num">${money(unitDebt(d.unitId))}</td><td>${fmtDate(d.dueDate)}</td><td>${sb('dues', d.status)}</td></tr>`; }).join('')}
    </tbody></table>${rows.length ? '' : '<div class="empty">Kayıt yok</div>'}</div>
    <div class="list-cards">${rows.map((d) => { const u = units.find((x) => x.id === d.unitId) || {}; return `<div class="item-card" data-id="${d.id}"><div class="row"><span class="title">${unitLabel(d.unitId)}</span>${sb('dues', d.status)}</div><div class="row small muted"><span>${esc(u.residentName || '—')}</span><span class="mono">${money(d.paidAmount)} / ${money(d.amount)}</span></div></div>`; }).join('')}</div>`;
  };
  const mount = (el) => {
    const re = () => { el.innerHTML = render(); mount(el); };
    el.querySelector('[data-period]').onchange = (e) => { period = e.target.value; ctx.state.period = period; re(); };
    el.querySelector('[data-debt]').onclick = () => { onlyDebt = !onlyDebt; ctx.state.onlyDebt = onlyDebt; re(); };
    const qi = el.querySelector('[data-q]'); qi.oninput = () => { q = qi.value; const pos = qi.selectionStart; re(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); };
    el.querySelector('[data-remind]').onclick = () => { const n = dues.filter((d) => d.period === period && d.status !== 'paid').length; toast(`${n} daireye push bildirimi + SMS hatırlatması gönderildi (demo)`); };
    el.querySelector('[data-bulk]').onclick = () => openForm('Toplu aidat tahakkuku', [{ key: 'period', label: 'Dönem (YYYY-AA)', required: true, default: nextPeriod(periods[0]) }, { key: 'amount', label: 'Standart aidat (₺)', type: 'number', required: true, default: ctx.site.monthlyDues }, { key: 'dueDay', label: 'Son ödeme günü', type: 'number', default: 10 }], {
      submitLabel: 'Tahakkuk oluştur', async onSubmit(v, close) {
        if (dues.some((d) => d.period === v.period)) { toast('Bu dönem için tahakkuk zaten var'); return; }
        for (const u of units) await ctx.store.add('dues', { id: `${u.id}_${v.period}`, unitId: u.id, period: v.period, amount: u.duesAmount || v.amount, paidAmount: 0, status: 'open', dueDate: `${v.period}-${String(v.dueDay).padStart(2, '0')}` });
        close(); toast(`${units.length} daireye tahakkuk oluşturuldu`); ctx.state.period = v.period; ctx.refresh();
      },
    });
    el.querySelectorAll('[data-id]').forEach((tr) => tr.onclick = () => {
      const d = dues.find((x) => x.id === tr.dataset.id); const u = units.find((x) => x.id === d.unitId) || {};
      const hist = dues.filter((x) => x.unitId === d.unitId).sort((a, b) => b.period.localeCompare(a.period));
      openModal(`${unitLabel(d.unitId)} · ${monthLabel(d.period)}`, `${detailList([['Oturan', esc(u.residentName)], ['Telefon', esc(u.phone)], ['Aidat', money(d.amount)], ['Ödenen', money(d.paidAmount)], ['Durum', sb('dues', d.status)], ['Son ödeme', fmtDate(d.dueDate)]])}
        <h3 style="margin:16px 0 8px">Dönem geçmişi</h3><div class="timeline">${hist.map((h) => `<div class="tl"><span class="muted small">${monthLabel(h.period)}</span><span>${money(h.paidAmount)} / ${money(h.amount)} ${sb('dues', h.status)}</span></div>`).join('')}</div>
        <div class="form-actions" style="margin-top:14px">${d.status !== 'paid' ? '<button class="btn" data-partial>Kısmi tahsilat</button><button class="btn primary" data-pay>Tahsilat kaydet</button>' : '<button class="btn" data-receipt>Makbuz</button>'}</div>`, {
        onMount(body, close) {
          const pay = async (amt) => { const paid = Math.min(d.amount, (d.paidAmount || 0) + amt); await ctx.store.update('dues', d.id, { paidAmount: paid, status: paid >= d.amount ? 'paid' : 'partial' }); await ctx.store.add('payments', { duesId: d.id, unitId: d.unitId, amount: amt, method: 'nakit', paidAt: new Date().toISOString(), period: d.period, receiptNo: `TH-${d.period.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}` }); close(); toast('Tahsilat kaydedildi, makbuz oluşturuldu'); ctx.refresh(); };
          body.querySelector('[data-pay]')?.addEventListener('click', () => pay(d.amount - (d.paidAmount || 0)));
          body.querySelector('[data-partial]')?.addEventListener('click', () => { const v = Number(prompt('Tahsil edilen tutar (₺)', String(d.amount - (d.paidAmount || 0)))); if (v > 0) pay(v); });
          body.querySelector('[data-receipt]')?.addEventListener('click', () => toast('Makbuz PDF olarak indirildi (demo)'));
        },
      });
    });
  };
  return { html: render(), mount };
}
const nextPeriod = (p) => { const [y, m] = p.split('-').map(Number); const d = new Date(y, m, 1); return d.toISOString().slice(0, 7); };

// ---------- AİDAT (SAKİN) ----------
export async function aidatim(ctx) {
  const u = ctx.me.unitId;
  const [dues, charges, payments] = await Promise.all([ctx.store.list('dues'), ctx.store.list('extraCharges'), ctx.store.list('payments')]);
  const my = dues.filter((d) => d.unitId === u).sort((a, b) => b.period.localeCompare(a.period));
  const myCh = charges.filter((c) => c.unitId === u);
  const openItems = [...my.filter((d) => d.status !== 'paid').map((d) => ({ id: d.id, col: 'dues', title: `${monthLabel(d.period)} aidatı`, amount: d.amount - (d.paidAmount || 0), due: d.dueDate })), ...myCh.filter((c) => c.status === 'open').map((c) => ({ id: c.id, col: 'extraCharges', title: c.title, amount: c.amount, due: c.dueDate }))];
  const total = sum(openItems, 'amount');
  const html = `
  <div class="grid cols-2">
    <div class="card"><div class="card-head"><h2>Ödenecekler</h2>${badge(money(total), total ? 'danger' : 'ok')}</div>
      ${openItems.length ? `<div class="feed">${openItems.map((i) => `<div class="feed-item"><input type="checkbox" checked data-item="${i.id}" data-col="${i.col}" style="margin-top:6px"><div style="flex:1"><b class="small">${esc(i.title)}</b><div class="small muted">Son ödeme ${fmtDate(i.due)}</div></div><b class="mono">${money(i.amount)}</b></div>`).join('')}</div>
      <div style="margin-top:14px;display:grid;gap:8px"><button class="btn primary block" data-pay>${icon('wallet')} Kredi kartı ile öde</button><button class="btn block" data-iban>${icon('receipt')} Havale / EFT bilgileri</button><button class="btn block" data-auto>${icon('refresh')} Otomatik ödeme talimatı ver</button></div>` : '<p class="muted">Bekleyen ödemeniz yok. 🎉</p>'}
    </div>
    <div class="card"><div class="card-head"><h2>Son ödemeler</h2></div>
      <div class="timeline">${payments.filter((p) => p.unitId === u).sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, 8).map((p) => `<div class="tl"><span class="muted small">${fmtDate(p.paidAt)}</span><span>${money(p.amount)} · ${esc({ havale: 'Havale', kart: 'Kart', nakit: 'Nakit' }[p.method] || p.method)} <a href="#" data-receipt="${p.receiptNo}" class="small">Makbuz</a></span></div>`).join('') || '<p class="muted">Kayıt yok</p>'}</div>
    </div>
  </div>
  <div class="card" style="margin-top:14px"><div class="card-head"><h2>Dönem dökümü</h2></div>
    <div class="table-wrap"><table><thead><tr><th>Dönem</th><th class="num">Aidat</th><th class="num">Ödenen</th><th>Son ödeme</th><th>Durum</th></tr></thead><tbody>${my.map((d) => `<tr><td>${monthLabel(d.period)}</td><td class="num">${money(d.amount)}</td><td class="num">${money(d.paidAmount)}</td><td>${fmtDate(d.dueDate)}</td><td>${sb('dues', d.status)}</td></tr>`).join('')}</tbody></table></div>
    <div class="list-cards">${my.map((d) => `<div class="item-card"><div class="row"><span class="title">${monthLabel(d.period)}</span>${sb('dues', d.status)}</div><div class="row small muted"><span>Son ödeme ${fmtDate(d.dueDate)}</span><span class="mono">${money(d.paidAmount)} / ${money(d.amount)}</span></div></div>`).join('')}</div>
  </div>`;
  const mount = (el) => {
    el.querySelector('[data-pay]')?.addEventListener('click', () => {
      const sel = [...el.querySelectorAll('[data-item]:checked')].map((c) => openItems.find((i) => i.id === c.dataset.item));
      const amt = sum(sel, 'amount'); if (!amt) return toast('Ödenecek kalem seçin');
      openModal('Sanal POS (demo)', `<p class="muted small">Gerçek sistemde burada bankanın 3D Secure ödeme sayfası açılır. Demo için ödeme simüle edilir.</p><div class="form" style="margin-top:12px"><div class="field full"><label>Kart numarası</label><input class="input" value="4111 1111 1111 1111"></div><div class="field"><label>Son kullanma</label><input class="input" value="12/28"></div><div class="field"><label>CVV</label><input class="input" value="123"></div><div class="field full"><label>Taksit</label><select class="input"><option>Tek çekim</option><option>2 taksit</option><option>3 taksit</option></select></div><div class="form-actions"><button class="btn" data-close>Vazgeç</button><button class="btn primary" data-ok>${money(amt)} öde</button></div></div>`, {
        onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => { for (const i of sel) { if (i.col === 'dues') { const d = my.find((x) => x.id === i.id); await ctx.store.update('dues', i.id, { paidAmount: d.amount, status: 'paid' }); await ctx.store.add('payments', { duesId: i.id, unitId: u, amount: i.amount, method: 'kart', paidAt: new Date().toISOString(), period: d.period, receiptNo: `TH-${Date.now().toString().slice(-6)}` }); } else await ctx.store.update('extraCharges', i.id, { status: 'paid' }); } close(); toast('Ödeme alındı, makbuzunuz e-postanıza gönderildi'); ctx.refresh(); }; },
      });
    });
    el.querySelector('[data-iban]')?.addEventListener('click', () => openModal('Havale / EFT', `<p><b>${esc(ctx.site.name)} Yönetimi</b><br>TR12 0006 4000 0011 2345 6789 01<br><span class="muted small">Açıklama: ${esc(unitLabel(u))} aidat</span></p><p class="small muted" style="margin-top:10px">Banka hareketi sisteme düştüğünde ödemeniz otomatik eşleşir ve bildirim alırsınız.</p>`));
    el.querySelector('[data-auto]')?.addEventListener('click', () => toast('Otomatik ödeme talimatı için banka sayfasına yönlendirildiniz (demo)'));
    el.querySelectorAll('[data-receipt]').forEach((a) => a.onclick = (e) => { e.preventDefault(); toast(`${a.dataset.receipt} makbuzu indirildi (demo)`); });
  };
  return { html, mount };
}

// ---------- BÜTÇE ----------
export async function budget(ctx) {
  const [b, exp, dues, charges, ads, res] = await Promise.all(['budgets', 'expenses', 'dues', 'extraCharges', 'adSpaces', 'reservations'].map((c) => ctx.store.list(c)));
  const planned = sum(b, 'planned'), actual = sum(b, 'actual');
  const income = { aidat: sum(dues, 'paidAmount'), ek: sum(charges.filter((c) => c.status === 'paid'), 'amount'), reklam: sum(ads.filter((a) => a.status === 'rented'), 'monthlyPrice') * 6, alan: sum(res.filter((r) => r.status === 'done' || r.status === 'approved'), 'amount') };
  const html = `
  <div class="kpis">${kpi({ label: 'Yıllık bütçe (işletme projesi)', value: money(planned) })}${kpi({ label: 'Gerçekleşen gider', value: money(actual), sub: `%${Math.round((actual / planned) * 100)} kullanıldı`, tone: 'warn' })}${kpi({ label: '6 aylık gelir', value: money(Object.values(income).reduce((a, c) => a + c, 0)), tone: 'ok' })}${kpi({ label: 'Son 6 ay kasa farkı', value: money(Object.values(income).reduce((a, c) => a + c, 0) - sum(exp, 'amount')), tone: 'primary' })}</div>
  <div class="grid cols-2">
    <div class="card"><div class="card-head"><h2>Bütçe kalemleri</h2><button class="btn sm" data-x>${icon('download')} Excel</button></div>
      ${b.map((x) => { const p = Math.round((x.actual / x.planned) * 100); return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between" class="small"><b>${esc(x.category)}</b><span class="muted">${money(x.actual)} / ${money(x.planned)} (%${p})</span></div>${progress(p, p > 95 ? 'danger' : p > 85 ? 'warn' : '')}</div>`; }).join('')}
    </div>
    <div class="card"><div class="card-head"><h2>Gelir kaynakları (6 ay)</h2></div>
      ${barChart([{ label: 'Aidat', value: income.aidat }, { label: 'Ek ücret', value: income.ek }, { label: 'Reklam', value: income.reklam }, { label: 'Ortak alan', value: income.alan }], { fmt: money })}
      <div class="small muted" style="margin-top:10px">Aidat dışı gelirler (reklam alanları, ortak alan kiraları, misafir otoparkı) bütçeye ayrı kalem olarak işlenir.</div>
    </div>
    <div class="card" style="grid-column:1/-1"><div class="card-head"><h2>Hazır raporlar</h2></div>
      <div class="quick">${['Aylık faaliyet raporu', 'Denetim kurulu raporu', 'Borçlu listesi', 'Gelir-gider tablosu', 'Mizan / muhasebe aktarımı', 'Genel kurul sunumu'].map((r) => `<button data-r="${esc(r)}">${icon('file')}${esc(r)}</button>`).join('')}</div>
    </div>
  </div>`;
  return { html, mount: (el) => { el.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => toast(`${b.dataset.r} PDF olarak hazırlandı (demo)`)); el.querySelector('[data-x]').onclick = () => toast('Excel dosyası indirildi (demo)'); } };
}

// ---------- OTOPARK ----------
export async function parking(ctx) {
  const spots = await ctx.store.list('parkingSpots'); const log = await ctx.store.list('parkingLog');
  const zones = [...new Set(spots.map((s) => s.zone))];
  const isAdmin = ctx.portal === 'admin'; const mine = spots.find((s) => s.unitId === ctx.me.unitId);
  const occ = spots.filter((s) => s.status === 'occupied').length; const guest = spots.filter((s) => s.kind === 'guest');
  const html = `
  <div class="kpis">${kpi({ label: 'Genel doluluk', value: `%${Math.round((occ / spots.length) * 100)}`, sub: `${occ}/${spots.length}`, tone: 'primary' })}${kpi({ label: 'Misafir otoparkı boş', value: guest.filter((s) => s.status === 'free').length, sub: `${guest.length} yer`, tone: 'ok' })}${isAdmin ? kpi({ label: 'Bugün araç geçişi', value: log.filter((l) => new Date(l.at).toDateString() === new Date().toDateString()).length }) : kpi({ label: 'Park yeriniz', value: mine?.id || '—', sub: mine ? mine.zone : 'Tanımlı değil' })}</div>
  ${!isAdmin ? `<div class="card" style="margin-bottom:14px"><div class="card-head"><h2>İşlemler</h2></div><div class="quick"><button data-guest>${icon('userplus')}Misafir aracı bildir</button><button data-wrong>${icon('alert')}Yerime park edilmiş</button><button data-plate>${icon('car')}Plaka ekle / değiştir</button></div></div>` : `<div class="toolbar"><button class="btn primary" data-in>${icon('plus')} Araç giriş/çıkış kaydet</button><button class="btn" data-fee>${icon('receipt')} Misafir ücret tarifesi</button></div>`}
  <div class="legend" style="margin-bottom:10px"><span><i style="background:var(--ok-soft);border:1px solid var(--ok)"></i>Boş</span><span><i style="background:var(--danger-soft);border:1px solid var(--danger)"></i>Dolu</span><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>Rezerve</span><span><i style="outline:2px dashed var(--border)"></i>Misafir</span></div>
  ${zones.map((z) => `<div class="card" style="margin-bottom:12px"><div class="card-head"><h3>${esc(z)}</h3><span class="small muted">${spots.filter((s) => s.zone === z && s.status === 'occupied').length}/${spots.filter((s) => s.zone === z).length} dolu</span></div><div class="parking">${spots.filter((s) => s.zone === z).map((s) => `<div class="spot ${s.status} ${s.kind === 'guest' ? 'guest' : ''} ${s.id === mine?.id ? 'me' : ''}" data-spot="${s.id}" title="${esc(s.plate || '')}" ${s.id === mine?.id ? 'style="box-shadow:0 0 0 3px var(--primary)"' : ''}>${esc(s.id)}</div>`).join('')}</div></div>`).join('')}`;
  const mount = (el) => {
    el.querySelectorAll('[data-spot]').forEach((d) => d.onclick = () => {
      const s = spots.find((x) => x.id === d.dataset.spot);
      openModal(`Park yeri ${s.id}`, `${detailList([['Bölge', esc(s.zone)], ['Tür', s.kind === 'guest' ? 'Misafir' : 'Sakin'], ['Daire', unitLabel(s.unitId)], ['Plaka', esc(s.plate || '—')], ['Durum', sb('parking', s.status)]])}${isAdmin ? `<div class="form-actions" style="margin-top:14px">${s.status === 'occupied' ? '<button class="btn" data-set="free">Çıkış yaptı</button>' : '<button class="btn primary" data-set="occupied">Araç girdi</button>'}${s.kind === 'guest' && s.status === 'free' ? '<button class="btn" data-set="reserved">Rezerve et</button>' : ''}</div>` : ''}`, {
        onMount(body, close) { body.querySelectorAll('[data-set]').forEach((b) => b.onclick = async () => { const plate = b.dataset.set === 'occupied' ? prompt('Plaka', s.plate || '') || s.plate : s.plate; await ctx.store.update('parkingSpots', s.id, { status: b.dataset.set, plate: b.dataset.set === 'free' && s.kind === 'guest' ? '' : plate }); await ctx.store.add('parkingLog', { spotId: s.id, plate, type: b.dataset.set === 'free' ? 'out' : 'in', at: new Date().toISOString() }); close(); toast('Güncellendi'); ctx.refresh(); }); },
      });
    });
    el.querySelector('[data-guest]')?.addEventListener('click', () => openForm('Misafir aracı bildir', [{ key: 'plate', label: 'Plaka', required: true }, { key: 'name', label: 'Misafir adı', required: true }, { key: 'expectedAt', label: 'Geliş', type: 'datetime-local', required: true }], { async onSubmit(v, close) { await ctx.store.add('visitors', { ...v, unitId: ctx.me.unitId, status: 'expected', code: String(Math.floor(100000 + Math.random() * 900000)) }); close(); toast('Bildirildi; misafiriniz bariyerden plaka ile geçebilecek'); } }));
    el.querySelector('[data-wrong]')?.addEventListener('click', () => openForm('Yerime park edilmiş', [{ key: 'plate', label: 'Aracın plakası' }, { key: 'description', label: 'Not', type: 'textarea' }], { async onSubmit(v, close) { await ctx.store.add('tickets', { title: `Park yeri ihlali (${mine?.id || ''}) ${v.plate || ''}`, category: 'guvenlik', priority: 'medium', status: 'open', unitId: ctx.me.unitId, description: v.description }); close(); toast('Güvenliğe iletildi'); } }));
    el.querySelector('[data-plate]')?.addEventListener('click', () => openForm('Plaka', [{ key: 'plate', label: 'Plaka', required: true }, { key: 'brand', label: 'Marka' }, { key: 'color', label: 'Renk' }], { async onSubmit(v, close) { await ctx.store.add('vehicles', { ...v, unitId: ctx.me.unitId, spot: mine?.id || '' }); close(); toast('Plaka kaydı yönetim onayına gönderildi'); } }));
    el.querySelector('[data-in]')?.addEventListener('click', () => openForm('Araç geçişi', [{ key: 'plate', label: 'Plaka', required: true }, { key: 'spotId', label: 'Park yeri', type: 'select', options: spots.map((s) => s.id) }, { key: 'type', label: 'Yön', type: 'select', options: [['in', 'Giriş'], ['out', 'Çıkış']] }], { async onSubmit(v, close) { await ctx.store.add('parkingLog', { ...v, at: new Date().toISOString() }); await ctx.store.update('parkingSpots', v.spotId, { status: v.type === 'in' ? 'occupied' : 'free', plate: v.type === 'in' ? v.plate : '' }); close(); toast('Kaydedildi'); ctx.refresh(); } }));
    el.querySelector('[data-fee]')?.addEventListener('click', () => openModal('Misafir otoparkı tarifesi', '<p>İlk 3 saat ücretsiz, sonraki her saat ₺50, günlük üst sınır ₺300. Ücret ilgili dairenin ek ücretlerine otomatik işlenir.</p>'));
  };
  return { html, mount };
}

// ---------- ANKET ----------
export async function polls(ctx) {
  const [polls, votes] = await Promise.all([ctx.store.list('polls'), ctx.store.list('votes')]);
  const isAdmin = ctx.portal === 'admin';
  const html = `${isAdmin ? `<div class="toolbar"><button class="btn primary" data-new>${icon('plus')} Yeni anket / oylama</button></div>` : ''}
  <div class="grid cols-2">${polls.map((p) => { const total = p.counts.reduce((a, c) => a + c, 0); const voted = votes.find((v) => v.pollId === p.id && v.unitId === ctx.me.unitId); return `<div class="card"><div class="card-head"><h3>${esc(p.title)}</h3>${sb('poll', p.status)}</div><div class="small muted" style="margin-bottom:10px">${p.audience === 'owners' ? 'Yalnızca mülk sahipleri' : 'Tüm sakinler'} · ${p.status === 'closed' ? 'Kapandı' : 'Bitiş'} ${fmtDate(p.endsAt)} · ${total} oy</div>
    ${p.options.map((o, i) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between" class="small"><span>${!isAdmin && p.status === 'open' && !voted ? `<button class="chip" data-vote="${p.id}:${i}">Oy ver</button> ` : ''}${esc(o)} ${voted?.option === i ? badge('Oyunuz', 'primary') : ''}</span><b>${total ? Math.round((p.counts[i] / total) * 100) : 0}%</b></div>${progress(total ? (p.counts[i] / total) * 100 : 0)}</div>`).join('')}
    ${isAdmin ? `<div class="form-actions">${p.status === 'open' ? `<button class="btn sm" data-close-poll="${p.id}">Oylamayı kapat</button>` : p.status === 'scheduled' ? `<button class="btn sm primary" data-open-poll="${p.id}">Oylamayı başlat</button>` : ''}</div>` : ''}</div>`; }).join('')}</div>`;
  const mount = (el) => {
    el.querySelectorAll('[data-vote]').forEach((b) => b.onclick = async () => { const [pid, i] = b.dataset.vote.split(':'); const p = polls.find((x) => x.id === pid); const counts = p.counts.slice(); counts[Number(i)]++; await ctx.store.update('polls', pid, { counts }); await ctx.store.add('votes', { pollId: pid, unitId: ctx.me.unitId, option: Number(i) }); toast('Oyunuz kaydedildi'); ctx.refresh(); });
    el.querySelectorAll('[data-close-poll]').forEach((b) => b.onclick = async () => { await ctx.store.update('polls', b.dataset.closePoll, { status: 'closed' }); ctx.refresh(); });
    el.querySelectorAll('[data-open-poll]').forEach((b) => b.onclick = async () => { await ctx.store.update('polls', b.dataset.openPoll, { status: 'open' }); ctx.refresh(); });
    el.querySelector('[data-new]')?.addEventListener('click', () => openForm('Yeni anket', [{ key: 'title', label: 'Soru', required: true, full: true }, { key: 'options', label: 'Seçenekler (her satıra bir tane)', type: 'textarea', required: true }, { key: 'endsAt', label: 'Bitiş', type: 'date', required: true }, { key: 'audience', label: 'Kitle', type: 'select', options: [['all', 'Tüm sakinler'], ['owners', 'Mülk sahipleri']] }, { key: 'weighted', label: 'Arsa payı ağırlıklı', type: 'checkbox' }], { async onSubmit(v, close) { const options = v.options.split('\n').map((s) => s.trim()).filter(Boolean); await ctx.store.add('polls', { title: v.title, options, counts: options.map(() => 0), endsAt: v.endsAt, audience: v.audience, status: 'open' }); close(); toast('Anket yayınlandı'); ctx.refresh(); } }));
  };
  return { html, mount };
}

// ---------- MESAJLAR ----------
export async function messages(ctx) {
  const all = await ctx.store.list('messages'); const isAdmin = ctx.portal === 'admin';
  let unit = isAdmin ? (ctx.state.unit || [...new Set(all.map((m) => m.unitId))][0]) : ctx.me.unitId;
  const threads = [...new Set(all.map((m) => m.unitId))];
  const render = () => { const msgs = all.filter((m) => m.unitId === unit).sort((a, b) => a.at.localeCompare(b.at)); return `
    <div class="grid" style="grid-template-columns:${isAdmin ? '240px 1fr' : '1fr'}">
      ${isAdmin ? `<div class="card" style="padding:8px"><div class="small muted" style="padding:6px 8px">Konuşmalar</div>${threads.map((t) => { const unread = all.filter((m) => m.unitId === t && m.from === 'resident' && !m.read).length; return `<button class="nav-item ${t === unit ? 'active' : ''}" data-thread="${t}">${icon('message')} ${unitLabel(t)} ${unread ? `<span class="badge danger">${unread}</span>` : ''}</button>`; }).join('')}<button class="nav-item" data-bulk>${icon('megaphone')} Toplu mesaj</button></div>` : ''}
      <div class="card"><div class="card-head"><h2>${isAdmin ? unitLabel(unit) : 'Site Yönetimi'}</h2><span class="small muted">Okundu bilgisi açık</span></div>
        <div class="feed" style="min-height:200px">${msgs.map((m) => { const mine = (m.from === 'admin') === isAdmin; return `<div style="display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'}"><div style="max-width:78%;padding:10px 12px;border-radius:14px;background:${mine ? 'var(--primary)' : 'var(--surface-2)'};color:${mine ? '#fff' : 'inherit'}">${esc(m.text)}<div class="small" style="opacity:.7;margin-top:4px">${fmtDateTime(m.at)}${mine && m.read ? ' · okundu' : ''}</div></div></div>`; }).join('')}</div>
        <form data-send style="display:flex;gap:8px;margin-top:12px"><input class="input" placeholder="Mesaj yazın..." required><button class="btn primary">Gönder</button></form></div>
    </div>`; };
  const mount = (el) => {
    el.querySelectorAll('[data-thread]').forEach((b) => b.onclick = () => { unit = b.dataset.thread; ctx.state.unit = unit; all.filter((m) => m.unitId === unit && m.from === 'resident').forEach((m) => { m.read = true; ctx.store.update('messages', m.id, { read: true }); }); el.innerHTML = render(); mount(el); });
    el.querySelector('[data-send]').onsubmit = async (e) => { e.preventDefault(); const t = e.target.querySelector('input').value; const m = await ctx.store.add('messages', { unitId: unit, from: isAdmin ? 'admin' : 'resident', text: t, at: new Date().toISOString(), read: false }); all.push(m); el.innerHTML = render(); mount(el); };
    el.querySelector('[data-bulk]')?.addEventListener('click', () => openForm('Toplu mesaj', [{ key: 'target', label: 'Hedef', type: 'select', options: ['Tüm sakinler', 'Borçlu daireler', 'A Blok', 'B Blok', 'C Blok', 'D Blok', 'Mülk sahipleri'] }, { key: 'channel', label: 'Kanal', type: 'select', options: ['Uygulama bildirimi', 'SMS', 'E-posta', 'Hepsi'] }, { key: 'text', label: 'Mesaj', type: 'textarea', required: true }], { async onSubmit(v, close) { close(); toast(`${v.target} grubuna ${v.channel} ile gönderildi (demo)`); } }));
  };
  return { html: render(), mount };
}

// ---------- ACİL ----------
export async function emergency(ctx) {
  const c = await ctx.store.list('emergencyContacts');
  const html = `<div class="card" style="border-color:var(--danger)"><div class="card-head"><h2>Acil durum bildirimi</h2>${badge('7/24', 'danger')}</div><p class="muted small">Tek dokunuşla güvenlik ve yönetime konumunuzla birlikte acil çağrı gider; isteğe bağlı olarak tüm blok sakinleri uyarılır.</p>
    <div class="quick" style="margin-top:12px">${[['Yangın', 'flame'], ['Sağlık', 'alert'], ['Güvenlik', 'shield'], ['Su / gaz kaçağı', 'droplet'], ['Asansörde mahsur', 'elevator'], ['Elektrik', 'bolt']].map(([t, i]) => `<button data-sos="${t}" style="color:var(--danger)">${icon(i)}${t}</button>`).join('')}</div></div>
  <div class="grid cols-2" style="margin-top:14px"><div class="card"><div class="card-head"><h2>Site hatları</h2></div><div class="feed">${c.filter((x) => x.kind === 'site').map((x) => `<a class="feed-item" href="tel:${x.phone.replace(/\s/g, '')}"><div class="ico">${icon('phone')}</div><div><b class="small">${esc(x.name)}</b><div class="small muted">${esc(x.phone)}</div></div></a>`).join('')}</div></div>
  <div class="card"><div class="card-head"><h2>Resmi hatlar</h2></div><div class="feed">${c.filter((x) => x.kind === 'public').map((x) => `<a class="feed-item" href="tel:${x.phone}"><div class="ico" style="background:var(--danger-soft);color:var(--danger)">${icon('phone')}</div><div><b class="small">${esc(x.name)}</b><div class="small muted">${esc(x.phone)}</div></div></a>`).join('')}</div></div>
  <div class="card" style="grid-column:1/-1"><div class="card-head"><h2>Tahliye planı</h2><button class="btn sm" data-plan>${icon('file')} PDF</button></div><p class="small muted">Toplanma alanı: Sosyal tesis önü. Asansör kullanmayın; yangın merdivenleri her katın doğu ucundadır.</p></div></div>`;
  return { html, mount: (el) => { el.querySelectorAll('[data-sos]').forEach((b) => b.onclick = () => confirmDialog(`${b.dataset.sos} acil çağrısı gönderilsin mi? Güvenlik ve yönetim anında bilgilendirilir.`, async () => { await ctx.store.add('tickets', { title: `ACİL: ${b.dataset.sos}`, category: 'guvenlik', priority: 'high', status: 'open', unitId: ctx.me.unitId, description: 'Acil durum butonu ile gönderildi' }); toast('Acil çağrı gönderildi. Güvenlik yolda.'); })); el.querySelector('[data-plan]').onclick = () => toast('Tahliye planı açıldı (demo)'); } };
}

// ---------- KAPSAM MUTABAKATI ----------
export async function scope(ctx) {
  const KEY = 'sy_scope_v1'; let state = {}; try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const admin = MODULES.filter((m) => (m.portal === 'admin' || m.portal === 'both') && !['panel', 'mutabakat', 'ayarlar'].includes(m.id));
  const resident = modulesFor('resident').filter((m) => !['ana-sayfa', 'ayarlar'].includes(m.id));
  const extras = [
    ['sms', 'SMS / e-posta bildirim altyapısı', 'Duyuru ve hatırlatmalar için toplu SMS ve e-posta gönderimi'],
    ['pos', 'Sanal POS entegrasyonu (banka / iyzico / PayTR)', 'Aidat ve ek ücretlerin kredi kartıyla online ödenmesi'],
    ['bank', 'Banka hesap hareketi eşleştirme', 'Havale/EFT ödemelerinin açıklama ve tutara göre otomatik eşleşmesi'],
    ['plate', 'Plaka tanıma / bariyer entegrasyonu', 'Kayıtlı plakalar ve bildirilmiş misafirler için otomatik geçiş'],
    ['tablet', 'Güvenlik tableti modu', 'Kapı görevlisi için büyük butonlu giriş-çıkış ve kargo ekranı'],
    ['pwa', 'Mobil uygulama (PWA, ana ekrana ekleme)', 'App Store / Play Store gerekmeden telefona kurulum, push bildirim'],
    ['stores', 'App Store ve Google Play yayını', 'Mağazalarda site adıyla uygulama (ek maliyet)'],
    ['acc', 'Muhasebe aktarımı (Excel / Luca / Logo)', 'Gelir-gider kayıtlarının muhasebe programına aktarımı'],
    ['multi', 'Çoklu site yönetimi', 'Profesyonel yönetim şirketleri için tek panelden birden çok site'],
    ['kvkk', 'KVKK aydınlatma ve onay yönetimi', 'Sakin verileri için açık rıza metinleri ve izin kayıtları'],
  ];
  const row = (id, title, desc, who) => { const s = state[id] || { on: true, phase: '1', note: '' }; return `<div class="scope-item ${s.on ? '' : 'off'}" data-row="${id}"><input type="checkbox" ${s.on ? 'checked' : ''} data-on><div><b>${esc(title)}</b><div class="small muted">${esc(desc)}</div></div><select class="input" style="width:auto;padding:6px 8px" data-phase><option value="1" ${s.phase === '1' ? 'selected' : ''}>Faz 1</option><option value="2" ${s.phase === '2' ? 'selected' : ''}>Faz 2</option><option value="3" ${s.phase === '3' ? 'selected' : ''}>Sonra</option></select><input class="input note small" placeholder="Not / özel istek" value="${esc(s.note)}" data-note></div>`; };
  const html = `
  <div class="card" style="margin-bottom:14px"><div class="card-head"><h2>Müşteri ile kapsam onayı</h2><div class="page-actions"><button class="btn" data-print>${icon('print')} Yazdır / PDF</button><button class="btn" data-export>${icon('download')} JSON</button><button class="btn primary" data-sign>${icon('check')} Mutabakat özeti</button></div></div>
    <p class="muted small">Her modülü müşteriyle birlikte gözden geçirin: dahil mi, hangi fazda, özel istekleri neler? Seçimler bu cihazda saklanır; özet çıktısı teklif/sözleşme ekine dönüştürülebilir.</p>
    <div class="form" style="margin-top:12px"><div class="field"><label>Site adı</label><input class="input" data-f="site" value="${esc(state._site || '')}" placeholder="Örn. Yeşil Vadi Sitesi"></div><div class="field"><label>Yetkili</label><input class="input" data-f="person" value="${esc(state._person || '')}" placeholder="Ad soyad / görev"></div><div class="field"><label>Daire sayısı</label><input class="input" data-f="units" value="${esc(state._units || '')}" type="number"></div><div class="field"><label>Tarih</label><input class="input" data-f="date" type="date" value="${esc(state._date || new Date().toISOString().slice(0, 10))}"></div></div></div>
  <h2 style="margin:8px 0 10px">Yönetim portalı (${admin.length} modül)</h2><div class="scope-list">${admin.map((m) => row(m.id, m.title, m.desc, 'admin')).join('')}</div>
  <h2 style="margin:20px 0 10px">Sakin portalı (${resident.length} modül)</h2><div class="scope-list">${resident.map((m) => row('r-' + m.id, m.residentTitle || m.title, m.residentDesc || m.desc, 'resident')).join('')}</div>
  <h2 style="margin:20px 0 10px">Entegrasyonlar ve ek hizmetler</h2><div class="scope-list">${extras.map(([id, t, d]) => row('x-' + id, t, d)).join('')}</div>`;
  const mount = (el) => {
    el.querySelectorAll('[data-row]').forEach((r) => { const id = r.dataset.row; const get = () => (state[id] ||= { on: true, phase: '1', note: '' }); r.querySelector('[data-on]').onchange = (e) => { get().on = e.target.checked; r.classList.toggle('off', !e.target.checked); save(); }; r.querySelector('[data-phase]').onchange = (e) => { get().phase = e.target.value; save(); }; r.querySelector('[data-note]').oninput = (e) => { get().note = e.target.value; save(); }; });
    el.querySelectorAll('[data-f]').forEach((i) => i.oninput = () => { state['_' + i.dataset.f] = i.value; save(); });
    el.querySelector('[data-print]').onclick = () => window.print();
    el.querySelector('[data-export]').onclick = () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kapsam-mutabakati.json'; a.click(); };
    el.querySelector('[data-sign]').onclick = () => { const all = [...admin.map((m) => ['Yönetim', m.id, m.title]), ...resident.map((m) => ['Sakin', 'r-' + m.id, m.residentTitle || m.title]), ...extras.map(([id, t]) => ['Entegrasyon', 'x-' + id, t])]; const by = (ph) => all.filter(([, id]) => { const s = state[id] || { on: true, phase: '1' }; return s.on && s.phase === ph; }); const off = all.filter(([, id]) => state[id] && !state[id].on); openModal('Mutabakat özeti', `<p><b>${esc(state._site || 'Site')}</b> · ${esc(state._person || '')} · ${esc(state._date || '')}</p>${[['1', 'Faz 1 — ilk teslim'], ['2', 'Faz 2'], ['3', 'Sonraki dönem']].map(([p, t]) => `<h3 style="margin:14px 0 6px">${t} (${by(p).length})</h3><ul class="small">${by(p).map(([w, id, t]) => `<li>${esc(t)} <span class="muted">· ${w}${state[id]?.note ? ' · ' + esc(state[id].note) : ''}</span></li>`).join('')}</ul>`).join('')}<h3 style="margin:14px 0 6px">Kapsam dışı (${off.length})</h3><ul class="small muted">${off.map(([w, , t]) => `<li>${esc(t)}</li>`).join('')}</ul><div class="form-actions" style="margin-top:14px"><button class="btn primary" onclick="window.print()">${icon('print')} Yazdır</button></div>`); };
  };
  return { html, mount };
}

// ---------- AYARLAR ----------
export async function settings(ctx) {
  const isAdmin = ctx.portal === 'admin';
  const html = `<div class="grid cols-2">
    ${isAdmin ? `<div class="card"><div class="card-head"><h2>Site bilgileri</h2></div><div class="form"><div class="field full"><label>Site adı</label><input class="input" value="${esc(ctx.site.name)}"></div><div class="field full"><label>Adres</label><input class="input" value="${esc(ctx.site.address)}"></div><div class="field"><label>Standart aidat (₺)</label><input class="input" type="number" value="${ctx.site.monthlyDues}"></div><div class="field"><label>Son ödeme günü</label><input class="input" type="number" value="${ctx.site.dueDay}"></div><div class="field"><label>Gecikme tazminatı (aylık %)</label><input class="input" type="number" value="2"></div><div class="field"><label>Para birimi</label><input class="input" value="TRY"></div><div class="form-actions"><button class="btn primary" data-save>Kaydet</button></div></div></div>
    <div class="card"><div class="card-head"><h2>Kullanıcılar ve roller</h2></div><div class="feed">${[['Ayşe Demir', 'Site Yöneticisi', 'admin'], ['Derya Ulu', 'Muhasebe', 'staff'], ['Hasan Yılmaz', 'Güvenlik', 'security'], ['Cemal Ak', 'Teknisyen', 'staff']].map(([n, r, k]) => `<div class="feed-item"><div class="ico">${icon('users')}</div><div style="flex:1"><b class="small">${n}</b><div class="small muted">${r}</div></div>${badge(k, 'info')}</div>`).join('')}</div><button class="btn block" style="margin-top:10px" data-invite>${icon('userplus')} Kullanıcı davet et</button></div>
    <div class="card"><div class="card-head"><h2>Ödeme kanalları</h2></div><div class="feed">${[['Sanal POS (iyzico)', 'Aktif', 'ok'], ['Havale / EFT eşleştirme', 'Aktif', 'ok'], ['Otomatik ödeme talimatı', 'Kurulum bekliyor', 'warn']].map(([n, s, t]) => `<div class="feed-item"><div class="ico">${icon('wallet')}</div><div style="flex:1"><b class="small">${n}</b></div>${badge(s, t)}</div>`).join('')}</div></div>` : `
    <div class="card"><div class="card-head"><h2>Profilim</h2></div><div class="form"><div class="field full"><label>Ad soyad</label><input class="input" value="${esc(ctx.me.name)}"></div><div class="field"><label>Daire</label><input class="input" value="${esc(unitLabel(ctx.me.unitId))}" disabled></div><div class="field"><label>Telefon</label><input class="input" value="0532 000 11 22"></div><div class="field full"><label>E-posta</label><input class="input" value="${esc(ctx.me.email)}"></div><div class="form-actions"><button class="btn primary" data-save>Kaydet</button></div></div></div>
    <div class="card"><div class="card-head"><h2>KVKK ve gizlilik</h2></div><p class="small muted">Verileriniz yalnızca site yönetimi tarafından, aidat ve site hizmetleri amacıyla işlenir. Aydınlatma metnini ve açık rıza kaydınızı buradan görüntüleyebilirsiniz.</p><button class="btn" style="margin-top:10px" data-kvkk>${icon('lock')} Aydınlatma metni</button></div>`}
    <div class="card"><div class="card-head"><h2>Bildirim tercihleri</h2></div>${['Duyurular', 'Aidat hatırlatmaları', 'Kargo / misafir', 'Talep durumu', 'Anket ve toplantılar'].map((n) => `<label style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span>${n}</span><input type="checkbox" checked></label>`).join('')}<label style="display:flex;justify-content:space-between;padding:8px 0"><span>SMS ile de gönder</span><input type="checkbox"></label></div>
    <div class="card"><div class="card-head"><h2>Görünüm</h2></div><div class="chips"><button class="chip" data-theme="light">Açık</button><button class="chip" data-theme="dark">Koyu</button><button class="chip" data-theme="">Sistem</button></div>
      <div class="card-head" style="margin-top:16px"><h2>Uygulama</h2></div><p class="small muted">Sürüm 0.1 · ${ctx.store.mode === 'demo' ? 'Demo modu (veriler bu tarayıcıda)' : 'Firebase bağlı'}</p>
      <div style="display:grid;gap:8px;margin-top:10px"><button class="btn" data-install>${icon('download')} Uygulamayı yükle</button>${ctx.store.mode === 'demo' ? `<button class="btn danger" data-reset>${icon('refresh')} Demo verisini sıfırla</button>` : ''}</div></div>
  </div>`;
  return { html, mount: (el) => {
    el.querySelector('[data-save]')?.addEventListener('click', () => toast('Kaydedildi'));
    el.querySelector('[data-invite]')?.addEventListener('click', () => openForm('Kullanıcı davet et', [{ key: 'email', label: 'E-posta', type: 'email', required: true }, { key: 'role', label: 'Rol', type: 'select', options: [['admin', 'Site yöneticisi'], ['staff', 'Personel'], ['security', 'Güvenlik'], ['resident', 'Sakin']] }, { key: 'unitId', label: 'Daire (sakin ise)' }], { async onSubmit(v, close) { close(); toast(`${v.email} adresine davet gönderildi (demo)`); } }));
    el.querySelector('[data-kvkk]')?.addEventListener('click', () => openModal('KVKK Aydınlatma Metni', '<p class="small">Bu metin, site yönetiminin veri sorumlusu olarak hangi verileri hangi amaçla işlediğini açıklar. Gerçek metin müşteri ile birlikte hazırlanır.</p>'));
    el.querySelectorAll('[data-theme]').forEach((b) => b.onclick = () => ctx.setTheme(b.dataset.theme));
    el.querySelector('[data-install]').onclick = () => ctx.install();
    el.querySelector('[data-reset]')?.addEventListener('click', () => confirmDialog('Demo verisi başlangıç haline dönecek. Devam?', () => { ctx.store.reset(); toast('Demo verisi sıfırlandı'); ctx.refresh(); }));
  } };
}

export const VIEWS = { adminDashboard, residentHome, aidat, aidatim, budget, parking, polls, messages, emergency, scope, settings };
