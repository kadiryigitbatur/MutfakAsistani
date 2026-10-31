'use strict';

/**
 * seed-demo.js – Firestore'a küçük ama temsilî bir demo site yazar.
 * -----------------------------------------------------------------
 * Kullanım:
 *   node seed-demo.js [siteId]          (varsayılan siteId: demo-site)
 *
 * Emülatöre yazmak için (önce `firebase emulators:start` çalışıyor olmalı):
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=sitem-54bfe node seed-demo.js
 *
 * Gerçek projeye yazmak için:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json GCLOUD_PROJECT=<proje-id> node seed-demo.js
 *
 * İçerik: 1 site, 2 blok, 8 daire, ayarlar, 3 ortak alan, 4 otopark yeri,
 * son 2 ayın aidatları, birkaç tahsilat, 3 duyuru, 3 talep, 1 anket.
 * Betik "set" + merge kullandığı için tekrar çalıştırılması güvenlidir.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

const SITE_ID = process.argv[2] || 'demo-site';
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT;
const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Hata: GOOGLE_APPLICATION_CREDENTIALS tanımlayın ya da emülatör için FIRESTORE_EMULATOR_HOST=localhost:8080 verin.');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {}),
});

const db = getFirestore();
const now = Timestamp.now();
const ts = (y, m, d, h = 12) => Timestamp.fromDate(new Date(Date.UTC(y, m - 1, d, h)));
const period = (offsetMonths) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offsetMonths);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

async function main() {
  const site = db.doc(`sites/${SITE_ID}`);
  const sub = (name) => site.collection(name);
  const batch = db.batch();
  const set = (ref, data) => batch.set(ref, { createdAt: now, ...data }, { merge: true });

  // ---- Site ----
  set(site, {
    name: 'Demo Konutları',
    address: 'Örnek Mah. Çınar Sok. No:1, Ataşehir / İstanbul',
    city: 'İstanbul',
    phone: '+90 216 000 00 00',
    unitCount: 8,
    isActive: true,
    plan: 'demo',
  });

  // ---- Ayarlar ----
  set(sub('settings').doc('general'), {
    currency: 'TRY',
    timeZone: 'Europe/Istanbul',
    managerName: 'Ahmet Yönetici',
    managerPhone: '+90 532 000 00 00',
    bankIban: 'TR00 0000 0000 0000 0000 0000 00',
  });
  set(sub('settings').doc('dues'), {
    monthlyAmount: 1500,
    dueDay: 10,
    lateFeeRate: 0.05, // aylık gecikme oranı (bilgi amaçlı)
    enabled: true,
  });

  // ---- Bloklar ----
  const blocks = [
    { id: 'A', name: 'A Blok', floors: 4, unitCount: 4 },
    { id: 'B', name: 'B Blok', floors: 4, unitCount: 4 },
  ];
  blocks.forEach((b) => set(sub('blocks').doc(b.id), { ...b, order: b.id === 'A' ? 1 : 2 }));

  // ---- Daireler (8) ----
  const units = [];
  for (const b of blocks) {
    for (let i = 1; i <= 4; i++) {
      units.push({
        id: `${b.id}-${i}`,
        blockId: b.id,
        number: String(i),
        floor: i,
        type: i % 2 === 0 ? '3+1' : '2+1',
        areaM2: i % 2 === 0 ? 125 : 95,
        occupancy: i === 4 ? 'tenant' : 'owner', // owner | tenant | empty
        ownerName: `Malik ${b.id}${i}`,
        ownerPhone: `+90 555 000 0${b.id === 'A' ? 0 : 1}${i}`,
        duesAmount: i % 2 === 0 ? 1800 : null, // null -> site varsayılanı
        isActive: true,
      });
    }
  }
  units.forEach((u) => set(sub('units').doc(u.id), u));

  // ---- Sakinler ----
  units.forEach((u, idx) =>
    set(sub('residents').doc(`res-${u.id}`), {
      unitId: u.id,
      name: u.occupancy === 'tenant' ? `Kiracı ${u.id}` : u.ownerName,
      phone: u.ownerPhone,
      relation: u.occupancy === 'tenant' ? 'tenant' : 'owner',
      isPrimary: true,
      moveInDate: ts(2023, (idx % 12) + 1, 1),
    }),
  );

  // ---- Araçlar ----
  set(sub('vehicles').doc('veh-1'), { unitId: 'A-1', plate: '34 ABC 123', brand: 'Renault', model: 'Clio', color: 'Beyaz' });
  set(sub('vehicles').doc('veh-2'), { unitId: 'B-2', plate: '34 XYZ 987', brand: 'Toyota', model: 'Corolla', color: 'Gri' });

  // ---- Otopark ----
  ['P-01', 'P-02', 'P-03', 'P-04'].forEach((id, i) =>
    set(sub('parkingSpots').doc(id), {
      number: id,
      level: 'Bodrum -1',
      type: i === 3 ? 'visitor' : 'resident',
      unitId: i === 0 ? 'A-1' : i === 1 ? 'B-2' : null,
      status: i < 2 ? 'assigned' : 'free',
    }),
  );

  // ---- Ortak alanlar ----
  set(sub('commonAreas').doc('fitness'), { name: 'Fitness Salonu', capacity: 6, slotMinutes: 60, requiresApproval: false, isActive: true });
  set(sub('commonAreas').doc('toplanti'), { name: 'Toplantı Odası', capacity: 20, slotMinutes: 120, requiresApproval: true, isActive: true });
  set(sub('commonAreas').doc('cocuk-parki'), { name: 'Çocuk Parkı', capacity: 30, slotMinutes: 0, requiresApproval: false, isActive: true });

  // ---- Aidatlar (son 2 dönem) ----
  const p0 = period(0);
  const p1 = period(1);
  const [y, m] = p0.split('-').map(Number);
  const [y1, m1] = p1.split('-').map(Number);
  units.forEach((u, idx) => {
    const amount = u.duesAmount || 1500;
    // Geçen ay: çoğu ödenmiş, bir tanesi kısmi, bir tanesi açık
    const prevStatus = idx === 2 ? 'partial' : idx === 5 ? 'open' : 'paid';
    const prevPaid = prevStatus === 'paid' ? amount : prevStatus === 'partial' ? Math.round(amount / 2) : 0;
    set(sub('dues').doc(`${u.id}_${p1}`), {
      unitId: u.id, blockId: u.blockId, period: p1, amount,
      paidAmount: prevPaid, status: prevStatus,
      dueDate: ts(y1, m1, 10), description: `${p1} dönemi aidatı`, createdBy: 'seed',
    });
    // Bu ay: hepsi açık, ikisi ödenmiş
    const curPaid = idx < 2;
    set(sub('dues').doc(`${u.id}_${p0}`), {
      unitId: u.id, blockId: u.blockId, period: p0, amount,
      paidAmount: curPaid ? amount : 0, status: curPaid ? 'paid' : 'open',
      dueDate: ts(y, m, 10), description: `${p0} dönemi aidatı`, createdBy: 'seed',
    });
  });

  // ---- Tahsilatlar (fonksiyon tetiklenmesin diye appliedToDues:true) ----
  const payments = [
    { unitId: 'A-1', duesId: `A-1_${p0}`, amount: 1500, method: 'bank' },
    { unitId: 'A-2', duesId: `A-2_${p0}`, amount: 1800, method: 'cash' },
    { unitId: 'A-3', duesId: `A-3_${p1}`, amount: 750, method: 'bank' },
  ];
  payments.forEach((p, i) =>
    set(sub('payments').doc(`pay-${i + 1}`), {
      ...p, currency: 'TRY', paidAt: ts(y, m, 3 + i), receivedBy: 'seed',
      appliedToDues: true, note: 'Demo tahsilat',
    }),
  );

  // ---- Ek ücret ----
  set(sub('extraCharges').doc('ec-1'), {
    unitId: 'B-4', amount: 450, title: 'Kapı kilidi onarım payı', status: 'open', dueDate: ts(y, m, 20),
  });

  // ---- Gider ve bütçe ----
  set(sub('expenses').doc('exp-1'), { title: 'Asansör bakımı', category: 'maintenance', amount: 3200, paidAt: ts(y1, m1, 15), supplierId: 'sup-1', status: 'paid' });
  set(sub('expenses').doc('exp-2'), { title: 'Elektrik (ortak alan)', category: 'utility', amount: 2100, paidAt: ts(y, m, 5), status: 'paid' });
  set(sub('suppliers').doc('sup-1'), { name: 'Asansör A.Ş.', phone: '+90 212 000 00 00', category: 'maintenance' });
  set(sub('budgets').doc(String(y)), { year: y, totalIncome: 8 * 1500 * 12, totalExpense: 120000, items: [
    { category: 'maintenance', planned: 40000 }, { category: 'utility', planned: 30000 }, { category: 'staff', planned: 50000 },
  ] });

  // ---- Duyurular ----
  set(sub('announcements').doc('ann-1'), {
    title: 'Su kesintisi hakkında', summary: 'Yarın 10:00-14:00 arası su kesintisi olacaktır.',
    body: 'İSKİ planlı bakım çalışması nedeniyle yarın 10:00-14:00 saatleri arasında su kesintisi yaşanacaktır.',
    category: 'maintenance', isPublished: true, publishedAt: ts(y, m, 2), isPinned: true, pushSentAt: now, createdBy: 'seed',
  });
  set(sub('announcements').doc('ann-2'), {
    title: 'Olağan genel kurul toplantısı', summary: 'Genel kurul ayın 25\'inde 19:30\'da toplantı odasında.',
    body: 'Gündem: 1) Bütçe görüşmesi 2) Yönetici seçimi 3) Dilek ve temenniler.',
    category: 'meeting', isPublished: true, publishedAt: ts(y, m, 4), isPinned: false, pushSentAt: now, createdBy: 'seed',
  });
  set(sub('announcements').doc('ann-3'), {
    title: 'Taslak: Otopark düzenlemesi', summary: '', body: 'Henüz yayınlanmadı.',
    category: 'general', isPublished: false, publishedAt: null, isPinned: false, createdBy: 'seed',
  });

  // ---- Talepler ----
  set(sub('tickets').doc('tk-1'), { title: 'Asansör 2. katta takılıyor', description: 'Dün akşamdan beri.', category: 'elevator', unitId: 'A-2', status: 'open', priority: 'high', createdBy: 'seed' });
  set(sub('tickets').doc('tk-2'), { title: 'Bahçe aydınlatması yanmıyor', description: 'B blok önü.', category: 'electric', unitId: 'B-1', status: 'in_progress', priority: 'normal', assignedTo: 'staff-1', createdBy: 'seed' });
  set(sub('tickets').doc('tk-3'), { title: 'Çöp alanı temizliği', description: 'Koku var.', category: 'cleaning', unitId: 'B-3', status: 'closed', priority: 'low', closedAt: ts(y, m, 6), createdBy: 'seed' });

  // ---- Personel ----
  set(sub('staff').doc('staff-1'), { name: 'Mehmet Kapıcı', role: 'staff', phone: '+90 533 000 00 01', isActive: true });
  set(sub('staff').doc('staff-2'), { name: 'Ayşe Güvenlik', role: 'security', phone: '+90 533 000 00 02', isActive: true });

  // ---- Ziyaretçi, kargo, giriş kaydı ----
  set(sub('visitors').doc('vis-1'), { unitId: 'A-1', name: 'Misafir Ali', plate: '34 MSF 001', expectedAt: ts(y, m, 12, 18), status: 'expected', createdBy: 'seed' });
  set(sub('deliveries').doc('del-1'), { unitId: 'B-2', courier: 'Kargo A.Ş.', trackingNo: 'TR123456', status: 'at_desk', receivedAt: ts(y, m, 7), createdBy: 'seed' });
  set(sub('accessLog').doc('acc-1'), { type: 'visitor_in', unitId: 'A-1', personName: 'Misafir Ali', plate: '34 MSF 001', createdBy: 'seed' });

  // ---- Anket ----
  set(sub('polls').doc('poll-1'), {
    question: 'Oyun parkı yenilensin mi?', options: ['Evet', 'Hayır', 'Çekimser'],
    status: 'open', startsAt: ts(y, m, 1), endsAt: ts(y, m, 28), createdBy: 'seed',
  });

  // ---- Toplantı / karar ----
  set(sub('meetings').doc('meet-1'), { title: 'Olağan Genel Kurul', scheduledAt: ts(y, m, 25, 16), location: 'Toplantı Odası', status: 'planned', agenda: ['Bütçe', 'Yönetici seçimi'] });
  set(sub('decisions').doc('dec-1'), { title: 'Aidat 1500 TL olarak belirlendi', meetingId: 'meet-0', decidedAt: ts(y1, m1, 20), votesFor: 6, votesAgainst: 2 });

  await batch.commit();
  console.log(`Demo veri yazıldı -> sites/${SITE_ID} (${usingEmulator ? 'EMÜLATÖR' : 'GERÇEK PROJE'})`);
  console.log('Sonraki adım: Auth\'ta bir kullanıcı oluşturun ve set-claims.js ile yetki verin.');
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err.message || err);
  process.exit(1);
});
