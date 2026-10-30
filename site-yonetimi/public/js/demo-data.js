// Demo veri üreticisi — müşteri sunumu için gerçekçi örnek site.
export const DEMO_SITE = {
  id: 'yesil-vadi', name: 'Yeşil Vadi Sitesi', address: 'Çamlık Mah. Vadi Cad. No:12, Çekmeköy / İstanbul',
  blocks: 4, unitsPerBlock: 24, monthlyDues: 2750, dueDay: 10, plan: 'Standart',
};

let seed = 20261;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const iso = (d) => d.toISOString();
const day = (off, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return iso(d); };
const dateOnly = (off) => day(off).slice(0, 10);
const period = (off) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return d.toISOString().slice(0, 7); };

const FIRST = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Elif', 'Can', 'Zeynep', 'Murat', 'Selin', 'Burak', 'Deniz', 'Emre', 'Gül', 'Hakan', 'İrem', 'Kerem', 'Leyla', 'Mert', 'Nazlı', 'Okan', 'Pınar', 'Serkan', 'Tuğba', 'Umut', 'Yasemin', 'Volkan', 'Ceren', 'Barış'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Erdoğan', 'Güneş', 'Taş'];
const PLATES = () => `34 ${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))} ${ri(100, 999)}`;
const name = () => `${pick(FIRST)} ${pick(LAST)}`;

export function buildDemoData() {
  seed = 20261;
  const d = { site: { ...DEMO_SITE } };
  const blockNames = ['A', 'B', 'C', 'D'];
  d.blocks = blockNames.map((b, i) => ({ id: b, name: `${b} Blok`, floors: 8, unitCount: 24, manager: name(), elevatorCount: 2, buildYear: 2014, status: i === 2 ? 'maintenance' : 'ok', note: i === 2 ? 'Dış cephe mantolama çalışması sürüyor' : '' }));

  d.units = []; d.residents = []; d.vehicles = [];
  for (const b of blockNames) for (let n = 1; n <= 24; n++) {
    const id = `${b}-${n}`; const floor = Math.ceil(n / 3); const type = pick(['2+1', '3+1', '3+1', '4+1']);
    const ownerName = id === 'A-12' ? 'Mehmet Kaya' : name();
    const occ = rnd() < 0.08 ? 'empty' : rnd() < 0.3 ? 'tenant' : 'owner';
    const area = type === '2+1' ? 95 : type === '3+1' ? 125 : 160;
    d.units.push({ id, blockId: b, no: n, floor, type, area, occupancy: occ, ownerName, residentName: occ === 'tenant' ? name() : occ === 'empty' ? '' : ownerName, phone: `05${ri(30, 55)}${ri(100, 999)}${ri(10, 99)}${ri(10, 99)}`, people: occ === 'empty' ? 0 : ri(1, 5), duesAmount: area >= 160 ? 3200 : DEMO_SITE.monthlyDues, parkingSpot: n <= 18 ? `${b}${n}` : '', createdAt: day(-400) });
    if (occ !== 'empty') {
      d.residents.push({ id: `r-${id}`, unitId: id, name: occ === 'tenant' ? d.units.at(-1).residentName : ownerName, kind: occ, phone: d.units.at(-1).phone, email: `${id.toLowerCase().replace('-', '')}@ornek.com`, moveIn: dateOnly(-ri(60, 2000)), kvkk: true, createdAt: day(-300) });
      if (rnd() < 0.8) d.vehicles.push({ id: `v-${id}`, unitId: id, plate: id === 'A-12' ? '34 MK 1234' : PLATES(), brand: pick(['Renault', 'Fiat', 'Toyota', 'VW', 'Hyundai', 'Peugeot', 'Honda', 'Tesla']), color: pick(['Beyaz', 'Siyah', 'Gri', 'Kırmızı', 'Mavi']), spot: n <= 18 ? `${b}${n}` : '', createdAt: day(-200) });
    }
  }

  // Aidat (son 6 dönem) ve tahsilatlar
  d.dues = []; d.payments = [];
  for (let p = -5; p <= 0; p++) {
    const per = period(p);
    for (const u of d.units) {
      const paidChance = p === 0 ? 0.55 : p === -1 ? 0.86 : 0.95;
      const r = rnd(); const status = r < paidChance ? 'paid' : r < paidChance + 0.06 ? 'partial' : 'open';
      const amount = u.duesAmount; const paid = status === 'paid' ? amount : status === 'partial' ? Math.round(amount * 0.5) : 0;
      const due = `${per}-${String(DEMO_SITE.dueDay).padStart(2, '0')}`;
      const id = `${u.id}_${per}`;
      d.dues.push({ id, unitId: u.id, period: per, amount, paidAmount: paid, status, dueDate: due, createdAt: `${per}-01T03:00:00.000Z` });
      if (paid > 0) d.payments.push({ id: `p-${id}`, duesId: id, unitId: u.id, amount: paid, method: pick(['havale', 'kart', 'kart', 'nakit']), paidAt: `${per}-${String(ri(2, 14)).padStart(2, '0')}T10:00:00.000Z`, period: per, createdAt: `${per}-10T10:00:00.000Z`, receiptNo: `TH-${per.replace('-', '')}-${ri(100, 999)}` });
    }
  }
  const openUnits = (u) => d.dues.some((x) => x.unitId === u && x.status !== 'paid');
  if (!openUnits('A-12')) { const x = d.dues.find((x) => x.id === `A-12_${period(0)}`); x.status = 'open'; x.paidAmount = 0; }

  d.extraCharges = [
    { id: 'e1', unitId: 'B-7', title: 'Mantolama katkı payı (3/6)', amount: 4500, status: 'open', dueDate: dateOnly(12), category: 'proje', createdAt: day(-20) },
    { id: 'e2', unitId: 'A-12', title: 'Misafir otoparkı ek kullanım (Eylül)', amount: 350, status: 'open', dueDate: dateOnly(5), category: 'otopark', createdAt: day(-9) },
    { id: 'e3', unitId: 'C-3', title: 'Sosyal tesis salon kirası', amount: 1500, status: 'paid', dueDate: dateOnly(-30), category: 'ortak-alan', createdAt: day(-45) },
    { id: 'e4', unitId: 'D-15', title: 'Gecikme faizi (Ağustos aidatı)', amount: 180, status: 'open', dueDate: dateOnly(3), category: 'gecikme', createdAt: day(-6) },
    { id: 'e5', unitId: 'A-4', title: 'Kapı kartı yenileme', amount: 250, status: 'paid', dueDate: dateOnly(-10), category: 'diger', createdAt: day(-15) },
    { id: 'e6', unitId: 'B-19', title: 'Su sayacı değişimi', amount: 1200, status: 'cancelled', dueDate: dateOnly(-2), category: 'diger', createdAt: day(-30) },
  ];
  d.expenses = [
    ['Personel maaşları', 'personel', 186000, -3], ['Elektrik (ortak alan)', 'enerji', 42300, -5], ['Su', 'enerji', 18900, -5], ['Doğalgaz (kazan dairesi)', 'enerji', 61000, -8],
    ['Asansör bakım sözleşmesi', 'bakim', 14400, -12], ['Temizlik malzemesi', 'malzeme', 6200, -14], ['Peyzaj & bahçe', 'bakim', 22000, -18], ['Güvenlik kamera yenileme', 'yatirim', 85000, -25],
    ['Jeneratör yakıt', 'enerji', 9400, -27], ['Hukuk müşavirliği', 'hizmet', 12000, -30], ['Sigorta (bina)', 'sigorta', 54000, -40], ['Yangın tüpü dolum', 'bakim', 3800, -44],
  ].map(([title, category, amount, off], i) => ({ id: `x${i}`, title, category, amount, date: dateOnly(off), supplier: pick(['Mavi Temizlik A.Ş.', 'Otis', 'Kent Enerji', 'Yeşil Peyzaj', 'Güven Sigorta']), status: 'paid', invoiceNo: `FT-${ri(1000, 9999)}`, createdAt: day(off) }));
  d.budgets = [
    ['Personel', 2100000, 1860000], ['Enerji', 1300000, 1180000], ['Bakım-Onarım', 600000, 410000], ['Güvenlik', 450000, 300000], ['Temizlik', 400000, 330000], ['Peyzaj', 250000, 220000], ['Yatırım', 800000, 520000], ['Sigorta & Hukuk', 300000, 190000],
  ].map(([category, planned, actual], i) => ({ id: `b${i}`, category, planned, actual, year: new Date().getFullYear(), createdAt: day(-300) }));

  d.projects = [
    { id: 'pr1', title: 'C Blok dış cephe mantolama', status: 'active', progress: 62, budget: 1850000, spent: 1120000, start: dateOnly(-70), end: dateOnly(40), owner: 'Yönetim Kurulu', contractor: 'Isı Yalıtım Ltd.', visibleToResidents: true, summary: 'Isı kaybını %35 azaltması hedeflenen mantolama ve boya çalışması.', createdAt: day(-90) },
    { id: 'pr2', title: 'Otopark LED aydınlatma dönüşümü', status: 'active', progress: 30, budget: 240000, spent: 60000, start: dateOnly(-15), end: dateOnly(30), owner: 'Teknik Birim', contractor: 'Parlak Elektrik', visibleToResidents: true, summary: 'Kapalı otoparkta 420 armatürün LED ile değişimi.', createdAt: day(-30) },
    { id: 'pr3', title: 'Çocuk parkı yenileme', status: 'planned', progress: 0, budget: 380000, spent: 0, start: dateOnly(45), end: dateOnly(90), owner: 'Sosyal Komite', contractor: '', visibleToResidents: true, summary: 'Kauçuk zemin ve yeni oyun grupları.', createdAt: day(-10) },
    { id: 'pr4', title: 'Su deposu temizliği ve klorlama', status: 'done', progress: 100, budget: 45000, spent: 43500, start: dateOnly(-60), end: dateOnly(-50), owner: 'Teknik Birim', contractor: 'Temiz Su Hizmetleri', visibleToResidents: false, summary: '', createdAt: day(-80) },
    { id: 'pr5', title: 'Blok girişlerine turnike / yüz tanıma', status: 'proposal', progress: 0, budget: 920000, spent: 0, start: '', end: '', owner: 'Güvenlik Komitesi', contractor: '', visibleToResidents: false, summary: 'Genel kurulda oylanacak.', createdAt: day(-5) },
  ];
  d.tenders = [
    { id: 't1', title: 'Yıllık temizlik hizmeti ihalesi', status: 'open', deadline: dateOnly(9), estimate: 1200000, bidCount: 4, category: 'hizmet', description: '12 ay, 6 personel, günlük temizlik + haftalık derin temizlik.', createdAt: day(-12) },
    { id: 't2', title: 'Güvenlik hizmeti (24 saat, 8 personel)', status: 'evaluation', deadline: dateOnly(-3), estimate: 3400000, bidCount: 5, category: 'hizmet', description: '', createdAt: day(-35) },
    { id: 't3', title: 'Çocuk parkı oyun grupları alımı', status: 'draft', deadline: dateOnly(30), estimate: 380000, bidCount: 0, category: 'mal', description: '', createdAt: day(-2) },
    { id: 't4', title: 'Asansör modernizasyonu (8 adet)', status: 'awarded', deadline: dateOnly(-60), estimate: 2600000, bidCount: 3, category: 'yapim', winner: 'Otis Türkiye', description: '', createdAt: day(-120) },
  ];
  d.bids = [
    { id: 'bd1', tenderId: 't1', company: 'Mavi Temizlik A.Ş.', amount: 1140000, score: 88, createdAt: day(-5) },
    { id: 'bd2', tenderId: 't1', company: 'Pırıl Hizmet', amount: 1090000, score: 81, createdAt: day(-4) },
    { id: 'bd3', tenderId: 't1', company: 'Kristal Temizlik', amount: 1260000, score: 90, createdAt: day(-3) },
    { id: 'bd4', tenderId: 't1', company: 'Nova Facility', amount: 1180000, score: 85, createdAt: day(-1) },
  ];
  d.purchases = [
    { id: 'pu1', title: 'Temizlik sarf malzemesi (Ekim)', supplier: 'Mavi Temizlik A.Ş.', amount: 6200, status: 'delivered', requestedBy: 'Temizlik Şefi', date: dateOnly(-14), category: 'malzeme', createdAt: day(-14) },
    { id: 'pu2', title: 'Jeneratör akü (2 adet)', supplier: 'Aküsan', amount: 9800, status: 'approved', requestedBy: 'Teknik Birim', date: dateOnly(-3), category: 'teknik', createdAt: day(-3) },
    { id: 'pu3', title: 'Bahçe sulama otomasyonu', supplier: 'Yeşil Peyzaj', amount: 38000, status: 'pending', requestedBy: 'Peyzaj', date: dateOnly(-1), category: 'yatirim', createdAt: day(-1) },
    { id: 'pu4', title: 'Yangın söndürme tüpü (20 adet)', supplier: 'Alev Yangın', amount: 14000, status: 'ordered', requestedBy: 'Güvenlik Şefi', date: dateOnly(-6), category: 'guvenlik', createdAt: day(-6) },
    { id: 'pu5', title: 'Havuz kimyasalları', supplier: 'Aqua Kimya', amount: 7300, status: 'rejected', requestedBy: 'Sosyal Tesis', date: dateOnly(-9), category: 'malzeme', createdAt: day(-9) },
  ];
  d.suppliers = [
    { id: 's1', name: 'Mavi Temizlik A.Ş.', category: 'Temizlik', contact: 'Selim Ak', phone: '0212 555 10 10', rating: 4, status: 'active', createdAt: day(-500) },
    { id: 's2', name: 'Otis Türkiye', category: 'Asansör', contact: 'Servis Hattı', phone: '0850 222 68 47', rating: 5, status: 'active', createdAt: day(-500) },
    { id: 's3', name: 'Yeşil Peyzaj', category: 'Bahçe', contact: 'Hülya Er', phone: '0532 111 22 33', rating: 4, status: 'active', createdAt: day(-400) },
    { id: 's4', name: 'Güven Sigorta', category: 'Sigorta', contact: 'Oğuz Sel', phone: '0216 444 55 66', rating: 3, status: 'active', createdAt: day(-300) },
    { id: 's5', name: 'Parlak Elektrik', category: 'Elektrik', contact: 'Kamil Işık', phone: '0533 999 88 77', rating: 4, status: 'active', createdAt: day(-200) },
  ];
  d.contracts = [
    { id: 'c1', title: 'Asansör bakım sözleşmesi', supplier: 'Otis Türkiye', amount: 172800, start: dateOnly(-300), end: dateOnly(65), status: 'active', renewal: 'auto', createdAt: day(-300) },
    { id: 'c2', title: 'Güvenlik hizmeti', supplier: 'Kale Güvenlik', amount: 3100000, start: dateOnly(-340), end: dateOnly(25), status: 'expiring', renewal: 'tender', createdAt: day(-340) },
    { id: 'c3', title: 'Bina sigortası (DASK + paket)', supplier: 'Güven Sigorta', amount: 54000, start: dateOnly(-40), end: dateOnly(325), status: 'active', renewal: 'manual', createdAt: day(-40) },
    { id: 'c4', title: 'Peyzaj bakım', supplier: 'Yeşil Peyzaj', amount: 264000, start: dateOnly(-200), end: dateOnly(165), status: 'active', renewal: 'auto', createdAt: day(-200) },
  ];

  d.adSpaces = [
    { id: 'ad1', name: 'Ana giriş totem (dijital)', type: 'dijital', size: '2x3 m', monthlyPrice: 12000, status: 'rented', tenant: 'Vadi Market', until: dateOnly(80), createdAt: day(-200) },
    { id: 'ad2', name: 'A Blok asansör ekranları', type: 'dijital', size: '32" x2', monthlyPrice: 3500, status: 'rented', tenant: 'Dentavadi Klinik', until: dateOnly(20), createdAt: day(-200) },
    { id: 'ad3', name: 'Otopark giriş panosu', type: 'pano', size: '4x2 m', monthlyPrice: 6000, status: 'free', tenant: '', until: '', createdAt: day(-200) },
    { id: 'ad4', name: 'Sosyal tesis ilan panosu', type: 'pano', size: '1x1.5 m', monthlyPrice: 1500, status: 'free', tenant: '', until: '', createdAt: day(-200) },
    { id: 'ad5', name: 'Site web/mobil uygulama banner', type: 'dijital', size: '1200x300', monthlyPrice: 2500, status: 'rented', tenant: 'Spor Vadi Fitness', until: dateOnly(50), createdAt: day(-100) },
  ];
  d.adCampaigns = [
    { id: 'ac1', advertiser: 'Vadi Market', spaceId: 'ad1', status: 'active', start: dateOnly(-40), end: dateOnly(80), amount: 48000, contact: 'Pazarlama Md.', stage: 'yayinda', createdAt: day(-50) },
    { id: 'ac2', advertiser: 'Dentavadi Klinik', spaceId: 'ad2', status: 'active', start: dateOnly(-100), end: dateOnly(20), amount: 14000, contact: 'Dr. Ece', stage: 'yenileme-gorusmesi', createdAt: day(-110) },
    { id: 'ac3', advertiser: 'Kent Emlak', spaceId: 'ad3', status: 'negotiation', start: dateOnly(15), end: dateOnly(195), amount: 36000, contact: 'Ali Bey', stage: 'teklif-gonderildi', createdAt: day(-4) },
    { id: 'ac4', advertiser: 'Çocuk Akademi', spaceId: 'ad4', status: 'lead', start: '', end: '', amount: 0, contact: 'İnfo', stage: 'ilk-temas', createdAt: day(-1) },
  ];

  // Otopark
  d.parkingSpots = [];
  for (const b of blockNames) for (let n = 1; n <= 18; n++) {
    const u = `${b}-${n}`; const occ = d.units.find((x) => x.id === u).occupancy !== 'empty';
    d.parkingSpots.push({ id: `${b}${n}`, zone: `${b} Blok -1`, kind: 'resident', unitId: u, status: occ ? (rnd() < 0.7 ? 'occupied' : 'free') : 'free', plate: occ ? (d.vehicles.find((v) => v.unitId === u)?.plate || '') : '', createdAt: day(-300) });
  }
  for (let n = 1; n <= 12; n++) d.parkingSpots.push({ id: `M${n}`, zone: 'Misafir', kind: 'guest', unitId: '', status: n <= 7 ? 'occupied' : n === 8 ? 'reserved' : 'free', plate: n <= 7 ? PLATES() : '', createdAt: day(-300) });
  d.parkingLog = Array.from({ length: 30 }, (_, i) => { const s = pick(d.parkingSpots); return { id: `pl${i}`, spotId: s.id, plate: s.plate || PLATES(), type: i % 2 ? 'in' : 'out', at: day(-Math.floor(i / 4), ri(6, 23), ri(0, 59)), createdAt: day(-Math.floor(i / 4), ri(6, 23)) }; });

  d.accessLog = Array.from({ length: 40 }, (_, i) => {
    const kind = pick(['resident', 'visitor', 'courier', 'vehicle', 'staff', 'service']);
    const u = pick(d.units).id;
    return { id: `al${i}`, kind, who: kind === 'courier' ? pick(['Aras Kargo', 'Yurtiçi', 'Trendyol Express', 'Getir']) : kind === 'staff' ? 'Temizlik personeli' : kind === 'service' ? 'Otis servis' : name(), unitId: kind === 'staff' || kind === 'service' ? '' : u, gate: pick(['Ana kapı', 'Otopark kapısı', 'Yaya girişi B']), direction: i % 3 === 0 ? 'out' : 'in', plate: kind === 'vehicle' ? PLATES() : '', at: day(-Math.floor(i / 10), ri(7, 22), ri(0, 59)), createdAt: day(-Math.floor(i / 10), ri(7, 22)) };
  });
  d.visitors = [
    { id: 'vi1', unitId: 'A-12', name: 'Selin Kaya', plate: '34 SK 4411', expectedAt: day(0, 18, 30), status: 'expected', note: 'Akşam yemeği misafiri', code: '482913', createdAt: day(-1) },
    { id: 'vi2', unitId: 'B-3', name: 'Tesisatçı Ramazan Usta', plate: '', expectedAt: day(0, 14, 0), status: 'arrived', note: 'Kombi bakımı', code: '117744', createdAt: day(0) },
    { id: 'vi3', unitId: 'C-8', name: 'Ebru Demir', plate: '34 ED 8080', expectedAt: day(-1, 20, 0), status: 'left', note: '', code: '906311', createdAt: day(-2) },
    { id: 'vi4', unitId: 'A-12', name: 'Ali Kaya', plate: '', expectedAt: day(2, 11, 0), status: 'expected', note: 'Babam', code: '556210', createdAt: day(0) },
  ];
  d.deliveries = [
    { id: 'de1', unitId: 'A-12', carrier: 'Trendyol Express', status: 'at_desk', receivedAt: day(0, 11, 20), code: 'TY-2291', size: 'küçük', createdAt: day(0, 11) },
    { id: 'de2', unitId: 'A-12', carrier: 'Yurtiçi Kargo', status: 'delivered', receivedAt: day(-2, 15, 0), deliveredAt: day(-2, 19, 10), code: 'YK-8812', size: 'orta', createdAt: day(-2, 15) },
    { id: 'de3', unitId: 'B-11', carrier: 'Aras Kargo', status: 'at_desk', receivedAt: day(-1, 10, 0), code: 'AR-1203', size: 'büyük', createdAt: day(-1, 10) },
    { id: 'de4', unitId: 'D-2', carrier: 'Getir', status: 'delivered', receivedAt: day(0, 9, 0), deliveredAt: day(0, 9, 5), code: 'GT-77', size: 'küçük', createdAt: day(0, 9) },
    { id: 'de5', unitId: 'C-20', carrier: 'PTT', status: 'at_desk', receivedAt: day(-3, 12, 0), code: 'PT-4410', size: 'zarf', createdAt: day(-3, 12) },
  ];

  d.commonAreas = [
    { id: 'ca1', name: 'Sosyal tesis — çok amaçlı salon', capacity: 120, hourlyPrice: 500, deposit: 2000, rules: 'Saat 23:00 sonrası ses yasağı. Temizlik ücreti dahil.', bookable: true, createdAt: day(-300) },
    { id: 'ca2', name: 'Mangal / piknik alanı', capacity: 30, hourlyPrice: 0, deposit: 0, rules: 'Haftada 1 rezervasyon hakkı.', bookable: true, createdAt: day(-300) },
    { id: 'ca3', name: 'Tenis kortu', capacity: 4, hourlyPrice: 150, deposit: 0, rules: 'En fazla 2 saat.', bookable: true, createdAt: day(-300) },
    { id: 'ca4', name: 'Toplantı odası', capacity: 16, hourlyPrice: 0, deposit: 0, rules: 'Yalnızca sakinler.', bookable: true, createdAt: day(-300) },
    { id: 'ca5', name: 'Kapalı havuz', capacity: 40, hourlyPrice: 0, deposit: 0, rules: 'Seans sistemi, 09:00-21:00.', bookable: true, createdAt: day(-300) },
    { id: 'ca6', name: 'Misafir dairesi', capacity: 4, hourlyPrice: 1200, deposit: 3000, rules: 'Günlük ücret, en fazla 3 gece.', bookable: true, createdAt: day(-300) },
  ];
  d.reservations = [
    { id: 're1', areaId: 'ca1', unitId: 'A-12', title: 'Doğum günü', startsAt: day(3, 15, 0), endsAt: day(3, 20, 0), status: 'approved', amount: 2500, createdAt: day(-4) },
    { id: 're2', areaId: 'ca3', unitId: 'B-5', title: 'Tenis', startsAt: day(0, 18, 0), endsAt: day(0, 19, 0), status: 'approved', amount: 150, createdAt: day(-1) },
    { id: 're3', areaId: 'ca2', unitId: 'C-14', title: 'Aile pikniği', startsAt: day(6, 12, 0), endsAt: day(6, 17, 0), status: 'pending', amount: 0, createdAt: day(0) },
    { id: 're4', areaId: 'ca6', unitId: 'D-9', title: 'Misafir konaklama', startsAt: day(10, 14, 0), endsAt: day(12, 11, 0), status: 'pending', amount: 2400, createdAt: day(0) },
    { id: 're5', areaId: 'ca4', unitId: 'A-3', title: 'Blok toplantısı', startsAt: day(1, 19, 30), endsAt: day(1, 21, 0), status: 'approved', amount: 0, createdAt: day(-2) },
    { id: 're6', areaId: 'ca1', unitId: 'B-22', title: 'Nişan', startsAt: day(-7, 14, 0), endsAt: day(-7, 22, 0), status: 'done', amount: 4000, createdAt: day(-20) },
  ];

  d.announcements = [
    { id: 'an1', title: 'C Blok mantolama: iskele kurulumu', body: 'Pazartesi itibarıyla C Blok kuzey cephesine iskele kurulacaktır. Balkonlarda eşya bırakılmaması rica olunur.', category: 'calisma', isPublished: true, publishedAt: day(-1, 9), pinned: true, audience: 'all', createdAt: day(-1) },
    { id: 'an2', title: 'Su kesintisi — 2 Kasım 10:00-14:00', body: 'İSKİ planlı bakım nedeniyle tüm bloklarda su kesintisi yaşanacaktır. Depo kapasitesi 4 saat yeterlidir.', category: 'kesinti', isPublished: true, publishedAt: day(-2, 17), pinned: true, audience: 'all', createdAt: day(-2) },
    { id: 'an3', title: 'Ekim ayı aidatlarının son ödeme günü 10 Ekim', body: 'Gecikmede aylık %2 gecikme tazminatı uygulanır. Online ödeme için uygulamayı kullanabilirsiniz.', category: 'finans', isPublished: true, publishedAt: day(-6, 10), pinned: false, audience: 'all', createdAt: day(-6) },
    { id: 'an4', title: 'Olağan genel kurul toplantısı — 24 Kasım', body: 'Gündem: 2027 bütçesi, turnike projesi oylaması, denetim raporu. Vekalet formları yönetim ofisinden alınabilir.', category: 'toplanti', isPublished: true, publishedAt: day(-8, 10), pinned: false, audience: 'owners', createdAt: day(-8) },
    { id: 'an5', title: 'Çocuk parkı yenileme anketi açıldı', body: 'Oyun grubu seçimi için anketimize katılın.', category: 'genel', isPublished: true, publishedAt: day(-3, 12), pinned: false, audience: 'all', createdAt: day(-3) },
    { id: 'an6', title: 'Havuz kış bakımı', body: 'Açık havuz 1 Kasım itibarıyla kapanacaktır.', category: 'genel', isPublished: false, publishedAt: '', pinned: false, audience: 'all', createdAt: day(0) },
  ];

  d.tickets = [
    { id: 'tk1', unitId: 'A-12', title: 'Asansör 2. katta takılıyor', category: 'asansor', priority: 'high', status: 'in_progress', assignee: 'Otis servis', createdAt: day(-1, 8), description: 'Kapı kapanmadan önce 2-3 saniye bekliyor, bazen durup kalıyor.' },
    { id: 'tk2', unitId: 'B-9', title: 'Koridor lambası yanmıyor (5. kat)', category: 'elektrik', priority: 'low', status: 'open', assignee: '', createdAt: day(0, 7), description: '' },
    { id: 'tk3', unitId: 'C-17', title: 'Otopark tavanında su sızıntısı', category: 'tesisat', priority: 'high', status: 'open', assignee: '', createdAt: day(0, 9), description: 'C17 park yerinin üstünden damlıyor.' },
    { id: 'tk4', unitId: 'A-12', title: 'Bahçe sulama saati gece 3 olmasın', category: 'peyzaj', priority: 'low', status: 'done', assignee: 'Yeşil Peyzaj', createdAt: day(-12), description: '' },
    { id: 'tk5', unitId: 'D-20', title: 'Gürültü şikayeti (D-21)', category: 'sikayet', priority: 'medium', status: 'open', assignee: 'Yönetim', createdAt: day(-2), description: 'Gece 1 sonrası tadilat sesi.' },
    { id: 'tk6', unitId: 'B-2', title: 'Kapı kartı çalışmıyor', category: 'guvenlik', priority: 'medium', status: 'done', assignee: 'Güvenlik', createdAt: day(-5), description: '' },
    { id: 'tk7', unitId: 'C-5', title: 'Çöp odasında koku', category: 'temizlik', priority: 'medium', status: 'in_progress', assignee: 'Temizlik Şefi', createdAt: day(-1), description: '' },
  ];
  d.maintenanceTasks = [
    { id: 'mt1', title: 'Asansör aylık periyodik bakım (8 asansör)', asset: 'Asansörler', frequency: 'aylik', nextDate: dateOnly(4), lastDate: dateOnly(-26), supplier: 'Otis Türkiye', status: 'due', legal: true, createdAt: day(-300) },
    { id: 'mt2', title: 'Jeneratör yük testi', asset: 'Jeneratör 400 kVA', frequency: 'aylik', nextDate: dateOnly(-2), lastDate: dateOnly(-32), supplier: 'Teknik Birim', status: 'overdue', legal: false, createdAt: day(-300) },
    { id: 'mt3', title: 'Yangın algılama sistemi kontrolü', asset: 'Yangın sistemi', frequency: '3-aylik', nextDate: dateOnly(20), lastDate: dateOnly(-70), supplier: 'Alev Yangın', status: 'planned', legal: true, createdAt: day(-300) },
    { id: 'mt4', title: 'Su deposu temizliği', asset: 'Su depoları', frequency: '6-aylik', nextDate: dateOnly(130), lastDate: dateOnly(-50), supplier: 'Temiz Su Hizmetleri', status: 'planned', legal: true, createdAt: day(-300) },
    { id: 'mt5', title: 'Hidrofor bakımı', asset: 'Hidrofor', frequency: '3-aylik', nextDate: dateOnly(11), lastDate: dateOnly(-79), supplier: 'Teknik Birim', status: 'planned', legal: false, createdAt: day(-300) },
    { id: 'mt6', title: 'Kazan dairesi kış hazırlığı', asset: 'Kazanlar', frequency: 'yillik', nextDate: dateOnly(1), lastDate: dateOnly(-364), supplier: 'Isı Servis', status: 'due', legal: true, createdAt: day(-300) },
  ];
  d.assets = [
    { id: 'as1', name: 'Jeneratör 400 kVA', category: 'teknik', location: 'Teknik hacim', purchaseDate: '2014-06-01', value: 650000, status: 'ok', createdAt: day(-300) },
    { id: 'as2', name: 'Güvenlik kamera sistemi (64 kamera)', category: 'guvenlik', location: 'Tüm site', purchaseDate: dateOnly(-25), value: 85000, status: 'ok', createdAt: day(-300) },
    { id: 'as3', name: 'Çim biçme traktörü', category: 'bahce', location: 'Bahçe deposu', purchaseDate: '2019-04-10', value: 120000, status: 'repair', createdAt: day(-300) },
    { id: 'as4', name: 'Havuz pompa grubu', category: 'teknik', location: 'Havuz makine dairesi', purchaseDate: '2016-05-20', value: 95000, status: 'ok', createdAt: day(-300) },
    { id: 'as5', name: 'Fitness ekipmanları (14 parça)', category: 'sosyal', location: 'Spor salonu', purchaseDate: '2021-01-15', value: 310000, status: 'ok', createdAt: day(-300) },
  ];
  d.staff = [
    { id: 'st1', name: 'Hasan Yılmaz', role: 'Güvenlik', shift: '08-16', phone: '0533 100 20 30', status: 'active', startDate: '2018-03-01', createdAt: day(-300) },
    { id: 'st2', name: 'Kadir Öz', role: 'Güvenlik', shift: '16-24', phone: '0533 100 20 31', status: 'active', startDate: '2020-07-01', createdAt: day(-300) },
    { id: 'st3', name: 'Nuri Acar', role: 'Güvenlik', shift: '24-08', phone: '0533 100 20 32', status: 'leave', startDate: '2019-01-15', createdAt: day(-300) },
    { id: 'st4', name: 'Sevgi Taş', role: 'Temizlik Şefi', shift: '07-15', phone: '0533 100 20 40', status: 'active', startDate: '2017-09-01', createdAt: day(-300) },
    { id: 'st5', name: 'Cemal Ak', role: 'Teknisyen', shift: '08-17', phone: '0533 100 20 50', status: 'active', startDate: '2016-02-01', createdAt: day(-300) },
    { id: 'st6', name: 'Ayşe Demir', role: 'Site Yöneticisi', shift: '09-18', phone: '0533 100 20 01', status: 'active', startDate: '2015-01-01', createdAt: day(-300) },
    { id: 'st7', name: 'Derya Ulu', role: 'Muhasebe', shift: '09-18', phone: '0533 100 20 02', status: 'active', startDate: '2021-05-01', createdAt: day(-300) },
  ];
  d.documents = [
    { id: 'do1', title: 'Yönetim planı (2015)', category: 'yonetim-plani', isPublic: true, date: '2015-01-10', size: '2.1 MB', createdAt: day(-300) },
    { id: 'do2', title: '2025 Genel kurul tutanağı', category: 'tutanak', isPublic: true, date: '2025-11-24', size: '640 KB', createdAt: day(-300) },
    { id: 'do3', title: '2026 İşletme projesi (bütçe)', category: 'butce', isPublic: true, date: '2025-12-15', size: '1.3 MB', createdAt: day(-300) },
    { id: 'do4', title: 'Denetim kurulu raporu — 1. yarıyıl', category: 'denetim', isPublic: true, date: dateOnly(-100), size: '880 KB', createdAt: day(-100) },
    { id: 'do5', title: 'Güvenlik hizmet sözleşmesi', category: 'sozlesme', isPublic: false, date: dateOnly(-340), size: '3.4 MB', createdAt: day(-340) },
    { id: 'do6', title: 'Acil durum ve tahliye planı', category: 'prosedur', isPublic: true, date: '2024-03-01', size: '5.0 MB', createdAt: day(-300) },
    { id: 'do7', title: 'Site yaşam kuralları (evcil hayvan, gürültü, otopark)', category: 'kurallar', isPublic: true, date: '2023-06-01', size: '410 KB', createdAt: day(-300) },
  ];
  d.meetings = [
    { id: 'me1', title: 'Olağan genel kurul 2026', date: day(25, 19, 0), place: 'Sosyal tesis salonu', status: 'planned', agenda: '1) Faaliyet raporu 2) Denetim raporu 3) 2027 bütçesi 4) Turnike projesi oylaması 5) Yönetim kurulu seçimi', quorum: '', createdAt: day(-8) },
    { id: 'me2', title: 'Yönetim kurulu — Ekim', date: day(-6, 19, 0), place: 'Toplantı odası', status: 'done', agenda: 'Temizlik ihalesi değerlendirme, mantolama hakediş', quorum: '5/5', createdAt: day(-15) },
    { id: 'me3', title: 'C Blok sakinleri bilgilendirme', date: day(2, 20, 0), place: 'Toplantı odası', status: 'planned', agenda: 'Mantolama takvimi ve balkon kullanımı', quorum: '', createdAt: day(-3) },
  ];
  d.decisions = [
    { id: 'dc1', no: '2026/14', title: 'Temizlik ihalesinin başlatılması', date: dateOnly(-12), body: 'Yıllık temizlik hizmeti için açık ihaleye çıkılmasına oybirliğiyle karar verildi.', votes: '5/5', createdAt: day(-12) },
    { id: 'dc2', no: '2026/13', title: 'Mantolama 3. hakediş ödemesi', date: dateOnly(-12), body: '₺310.000 tutarındaki 3. hakedişin ödenmesine karar verildi.', votes: '4/5', createdAt: day(-12) },
    { id: 'dc3', no: '2026/12', title: 'Misafir otoparkı ücret tarifesi', date: dateOnly(-40), body: 'Günlük 3 saati aşan misafir araçlar için saatlik ₺50 ücret uygulanır.', votes: '5/5', createdAt: day(-40) },
  ];
  d.polls = [
    { id: 'po1', title: 'Çocuk parkı oyun grubu seçimi', status: 'open', endsAt: dateOnly(6), options: ['Ahşap doğal tema', 'Renkli metal set', 'Kapsayıcı (engelli erişimli) set'], counts: [41, 18, 52], audience: 'all', createdAt: day(-3) },
    { id: 'po2', title: 'Genel kurul: Turnike / yüz tanıma projesi', status: 'scheduled', endsAt: dateOnly(25), options: ['Kabul', 'Ret', 'Çekimser'], counts: [0, 0, 0], audience: 'owners', createdAt: day(-5) },
    { id: 'po3', title: 'Havuz saatleri (yaz dönemi)', status: 'closed', endsAt: dateOnly(-60), options: ['08-20', '09-21', '10-22'], counts: [22, 58, 31], audience: 'all', createdAt: day(-90) },
  ];
  d.votes = [{ id: 'vt1', pollId: 'po3', unitId: 'A-12', option: 1, createdAt: day(-70) }];
  d.marketplace = [
    { id: 'mk1', unitId: 'B-14', title: 'Bebek arabası (Chicco) — temiz', kind: 'satilik', price: 3500, status: 'active', contact: 'Uygulama mesajı', createdAt: day(-2) },
    { id: 'mk2', unitId: 'C-6', title: 'Matematik özel ders (lise)', kind: 'hizmet', price: 800, status: 'active', contact: '0532 ...', createdAt: day(-5) },
    { id: 'mk3', unitId: 'A-12', title: 'Çalışma masası — ücretsiz', kind: 'ucretsiz', price: 0, status: 'active', contact: 'Uygulama mesajı', createdAt: day(-1) },
    { id: 'mk4', unitId: 'D-11', title: 'Kedi bakıcısı aranıyor (hafta sonu)', kind: 'aranıyor', price: 0, status: 'active', contact: 'Uygulama mesajı', createdAt: day(0) },
    { id: 'mk5', unitId: 'B-1', title: 'Bisiklet (26 jant)', kind: 'satilik', price: 4200, status: 'sold', contact: '', createdAt: day(-20) },
  ];
  d.lostFound = [
    { id: 'lf1', title: 'Siyah cüzdan', where: 'Otopark -1, B girişi', kind: 'bulundu', status: 'open', date: dateOnly(-1), holder: 'Güvenlik kulübesi', createdAt: day(-1) },
    { id: 'lf2', title: 'Çocuk bisikleti kaskı (mavi)', where: 'Çocuk parkı', kind: 'bulundu', status: 'returned', date: dateOnly(-6), holder: 'Teslim edildi', createdAt: day(-6) },
    { id: 'lf3', title: 'Araba anahtarı (Renault)', where: 'Sosyal tesis', kind: 'kayip', status: 'open', date: dateOnly(0), holder: '', unitId: 'C-9', createdAt: day(0) },
  ];
  d.legalCases = [
    { id: 'lg1', unitId: 'D-15', title: 'Aidat alacağı icra takibi', amount: 16500, stage: 'icra', lawyer: 'Av. Nil Koç', opened: dateOnly(-80), nextDate: dateOnly(14), status: 'active', createdAt: day(-80) },
    { id: 'lg2', unitId: 'B-19', title: 'Ödeme protokolü (taksitli)', amount: 9200, stage: 'protokol', lawyer: 'Av. Nil Koç', opened: dateOnly(-30), nextDate: dateOnly(10), status: 'active', createdAt: day(-30) },
    { id: 'lg3', unitId: 'A-21', title: 'Aidat alacağı — ihtarname', amount: 5500, stage: 'ihtar', lawyer: '', opened: dateOnly(-7), nextDate: dateOnly(8), status: 'active', createdAt: day(-7) },
    { id: 'lg4', unitId: 'C-2', title: 'Ortak alan hasar tazmini', amount: 12000, stage: 'dava', lawyer: 'Av. Nil Koç', opened: dateOnly(-200), nextDate: dateOnly(-5), status: 'closed', createdAt: day(-200) },
  ];
  d.messages = [
    { id: 'ms1', unitId: 'A-12', from: 'resident', text: 'Merhaba, Ekim aidatını taksitle ödeyebilir miyim?', at: day(-1, 14, 10), read: true, createdAt: day(-1, 14) },
    { id: 'ms2', unitId: 'A-12', from: 'admin', text: 'Merhaba Mehmet Bey, iki taksit olarak tanımlayabiliriz. Onaylıyor musunuz?', at: day(-1, 15, 2), read: true, createdAt: day(-1, 15) },
    { id: 'ms3', unitId: 'A-12', from: 'resident', text: 'Evet, onaylıyorum. Teşekkürler.', at: day(-1, 15, 20), read: false, createdAt: day(-1, 15, 20) },
    { id: 'ms4', unitId: 'C-17', from: 'resident', text: 'Otoparktaki sızıntı için ne zaman gelinecek?', at: day(0, 10, 5), read: false, createdAt: day(0, 10) },
  ];
  d.notifications = [
    { id: 'nt1', unitId: 'A-12', title: 'Kargonuz güvenlikte', body: 'Trendyol Express — TY-2291', at: day(0, 11, 21), read: false, createdAt: day(0, 11) },
    { id: 'nt2', unitId: 'A-12', title: 'Rezervasyonunuz onaylandı', body: 'Sosyal tesis salonu — doğum günü', at: day(-1, 9), read: false, createdAt: day(-1, 9) },
    { id: 'nt3', unitId: 'A-12', title: 'Talebiniz işleme alındı', body: 'Asansör arızası servise iletildi.', at: day(-1, 8, 30), read: true, createdAt: day(-1, 8) },
  ];
  d.household = [
    { id: 'hh1', unitId: 'A-12', name: 'Mehmet Kaya', relation: 'Mülk sahibi', phone: '0532 000 11 22', kind: 'person', createdAt: day(-300) },
    { id: 'hh2', unitId: 'A-12', name: 'Zeynep Kaya', relation: 'Eş', phone: '0532 000 11 23', kind: 'person', createdAt: day(-300) },
    { id: 'hh3', unitId: 'A-12', name: 'Ela Kaya', relation: 'Çocuk', phone: '', kind: 'person', createdAt: day(-300) },
    { id: 'hh4', unitId: 'A-12', name: 'Boncuk (kedi)', relation: 'Evcil hayvan', phone: '', kind: 'pet', createdAt: day(-300) },
    { id: 'hh5', unitId: 'A-12', name: 'Gülten Hanım', relation: 'Yardımcı (haftada 2 gün)', phone: '0533 444 55 66', kind: 'helper', createdAt: day(-100) },
  ];
  d.emergencyContacts = [
    { id: 'ec1', name: 'Site güvenlik (7/24)', phone: '0533 100 20 30', kind: 'site' }, { id: 'ec2', name: 'Yönetim ofisi', phone: '0216 500 10 10', kind: 'site' },
    { id: 'ec3', name: 'Teknik acil (asansör/su/elektrik)', phone: '0533 100 20 50', kind: 'site' }, { id: 'ec4', name: 'Acil çağrı merkezi', phone: '112', kind: 'public' },
    { id: 'ec5', name: 'İGDAŞ gaz kaçağı', phone: '187', kind: 'public' }, { id: 'ec6', name: 'İSKİ arıza', phone: '153', kind: 'public' }, { id: 'ec7', name: 'Elektrik arıza (BEDAŞ/AYEDAŞ)', phone: '186', kind: 'public' },
  ];
  return d;
}
