# Site Yönetimi Platformu — Ürün Konsepti ve Kapsam Mutabakatı

Bu döküman, müşteri (site yönetimi) ile ilk görüşmede sistemin ne olduğunu anlatmak ve
modül modül **kapsam mutabakatı** sağlamak için hazırlanmıştır. Uygulamanın içindeki
**Kapsam Mutabakatı** sayfası (Yönetim portalı › Sistem) bu listeyi etkileşimli olarak
sunar: her modül için *dahil / hariç* ve *Faz 1 / Faz 2 / Sonra* seçimi yapılır, not düşülür,
özet yazdırılır.

## 1. Ürün nedir?

Tek bir web adresi üzerinden çalışan, telefona ve bilgisayara **uygulama gibi yüklenebilen**
(PWA) bir site yönetim platformu. İki ayrı yüzü vardır:

| | Yönetim portalı | Sakin portalı |
|---|---|---|
| Kim kullanır | Site yöneticisi, muhasebe, güvenlik, teknik personel | Mülk sahipleri ve kiracılar |
| Amaç | Para, operasyon, güvenlik ve iletişimi tek yerden yönetmek | Borcunu görmek, ödemek, talep açmak, site yaşamına katılmak |
| Cihaz | Masaüstü ağırlıklı, tablet ve telefonda da tam çalışır | Telefon ağırlıklı, bilgisayarda da çalışır |

Teknik altyapı Google Firebase'dir (kimlik doğrulama, veritabanı, dosya depolama,
barındırma, bildirim). Her site kendi veri alanında tutulur; aynı sistem birden fazla
siteye (çoklu site / yönetim şirketi) hizmet verebilir.

## 2. Yönetim portalı modülleri

### Finans
- **Aidat takibi** — aylık toplu tahakkuk, daire bazlı aidat tutarı, tahsilat oranı, borçlu listesi, gecikme tazminatı, borçlulara tek tuşla hatırlatma (bildirim/SMS), dönem geçmişi.
- **Tahsilatlar** — sanal POS, havale/EFT ve nakit; makbuz üretimi; banka ekstresi ile otomatik eşleştirme.
- **Ek ücretler** — aidat dışı tahakkuklar: proje katkı payı, ortak alan kirası, misafir otoparkı, gecikme tazminatı, hasar bedeli, kart yenileme.
- **Giderler** — fatura/fiş kaydı, kategori, tedarikçi, fiş fotoğrafı; muhasebe aktarımı.
- **Bütçe & raporlar** — işletme projesi (yıllık bütçe) ile gerçekleşen karşılaştırması, gelir kaynakları, hazır raporlar (faaliyet, denetim, borçlu listesi, genel kurul sunumu).
- **Hukuki takip** — ihtar → icra → dava aşamaları, avukat, vade/duruşma tarihleri, ödeme protokolleri.

### Operasyon
- **Projeler** — mantolama, asansör yenileme gibi işler; bütçe/harcama, ilerleme yüzdesi, yüklenici; sakinlere görünür ilerleme.
- **İhaleler** — şartname, kapalı teklif toplama, teklif karşılaştırma ve puanlama, kazanan, sözleşmeye geçiş.
- **Satınalma** — talep → onay → sipariş → teslim; limit üstü alımlarda kurul onayı.
- **Tedarikçiler** ve **Sözleşmeler** — firma kartları, puanlama, sözleşme bitiş uyarıları (60/30/7 gün), otomatik yenileme / ihaleye çıkma kararı.
- **Talep & arıza** — sakinlerden gelen kayıtlar, fotoğraf, öncelik, atama, çözüm bildirimi, SLA.
- **Periyodik bakım** — asansör, jeneratör, yangın, hidrofor, su deposu gibi yasal zorunlu bakımların takvimi ve gecikme uyarıları.
- **Demirbaş** — envanter, konum, değer, servis geçmişi, QR ile sayım.
- **Personel & vardiya** — güvenlik/temizlik/teknik kadro, vardiya planı, izin, görev listeleri.

### Güvenlik ve alanlar
- **Giriş / çıkış kayıtları** — kapı ve bariyer geçişleri, ziyaretçi, kurye, araç, personel; güvenlik tableti ile hızlı kayıt; plaka tanıma entegrasyonu.
- **Misafir bildirimleri** — sakin misafirini önceden bildirir, güvenlik tek kodla doğrular, plaka varsa bariyer otomatik açılır.
- **Kargo & teslimat** — güvenliğe bırakılan kargo sakine anında bildirilir; teslim kaydı.
- **Otopark** — sakin/misafir park yerleri doluluk haritası, plaka eşleştirme, misafir otoparkı ücretlendirme, ihlal bildirimi.
- **Ortak alan rezervasyonu** — sosyal tesis, spor alanları, misafir dairesi; ücret/depozito, onay akışı, çakışma kontrolü.

### Reklam ve gelir
- **Reklam alanları** — pano, totem, asansör ekranı, dijital alan envanteri; fiyat, doluluk, sözleşme bitişleri.
- **Reklam süreçleri** — reklam veren adayları: ilk temas → teklif → sözleşme → yayın → yenileme; gelir tahmini.

### Sakinler ve yapı
- **Bloklar**, **Daireler**, **Sakinler**, **Araçlar** — bağımsız bölüm kartları (mal sahibi/kiracı, m², aidat, park yeri, kişi sayısı), KVKK onayları, uygulama davetiyesi, toplu SMS/e-posta, plaka kayıtları.

### Katılım ve iletişim
- **Duyurular** — push bildirim, e-posta, SMS; sabitleme; hedef kitle (tümü / mülk sahipleri / blok).
- **Anket & oylama** — daire başına tek oy, arsa payı ağırlıklı oylama seçeneği, canlı sonuç.
- **Toplantılar** ve **Yönetim kararları** — genel kurul/kurul toplantıları, gündem, davet, vekalet, numaralı karar defteri.
- **Belgeler** — yönetim planı, tutanaklar, bütçe, denetim raporları, sözleşmeler, acil durum planı; sakinlere açık/kapalı.
- **Mesajlar** — daire bazlı yazışma, okundu bilgisi, toplu mesaj.
- **Komşu pazarı** ve **Kayıp & buluntu** — sakinler arası ilanlar (moderasyonlu), güvenlikteki buluntular.

### Sistem
- **Kapsam mutabakatı** — bu döküman ile aynı listenin etkileşimli hali.
- **Ayarlar** — site bilgileri, aidat tarifesi, ödeme kanalları, kullanıcı rolleri, bildirim tercihleri.

## 3. Sakin portalı modülleri

- **Ana sayfa** — borç durumu, hızlı işlemler, bildirimler, bugünkü kargo/misafir/rezervasyon.
- **Aidat & borçlarım** — dönem dökümü, kredi kartıyla ödeme, havale bilgileri, otomatik ödeme talimatı, makbuz indirme.
- **Duyurular** — yayındaki duyurular, önemli olanlar üstte.
- **Taleplerim** — arıza/şikayet/istek açma, fotoğraf, durum takibi.
- **Rezervasyonlarım** — ortak alan seçimi, ücret, onay bekleme, iptal.
- **Misafirlerim** — misafir bildirimi ve tek kullanımlık giriş kodu.
- **Kargolarım** — güvenlikte bekleyen kargolar.
- **Otopark** — kendi park yeri, misafir otoparkı doluluğu, misafir aracı bildirme, ihlal bildirimi, plaka ekleme.
- **Anket & oylama** — oy verme ve canlı sonuç.
- **Projeler**, **Toplantılar**, **Kararlar**, **Belgeler** — yönetimin paylaştığı bilgiler.
- **Yönetime mesaj** — birebir yazışma.
- **Komşu pazarı**, **Kayıp & buluntu** — ilan verme ve görüntüleme.
- **Hanem** — aile üyeleri, evcil hayvan, yardımcı personel, araç kayıtları.
- **Acil durum** — tek dokunuşla güvenlik/teknik hat, acil çağrı butonu, tahliye planı.
- **Ayarlar** — profil, bildirim tercihleri, KVKK metni, uygulamayı yükleme.

## 4. Roller

| Rol | Erişim |
|---|---|
| Sistem yöneticisi (yazılım sahibi) | Tüm siteler, tüm veriler |
| Site yöneticisi | Kendi sitesinde tüm modüller |
| Personel (muhasebe, teknik) | Yöneticinin açtığı modüller |
| Güvenlik | Giriş-çıkış, misafir doğrulama, kargo, otopark, talepler |
| Sakin (mal sahibi / kiracı) | Yalnızca kendi dairesinin verileri ve sitenin herkese açık içerikleri |

## 5. Teknik özellikler (müşteriye söylenecek dille)

- **Uygulama gibi kurulur**: sitede ilk açılışta tarayıcı "Uygulamayı yükle" diye sorar; yüklenince masaüstünde ve telefon ana ekranında kısayol olur, tam ekran açılır. App Store / Play Store zorunluluğu yoktur.
- **Her cihazda çalışır**: telefon, tablet, bilgisayar; açık/koyu tema.
- **Çevrimdışı açılış**: internet yokken de arayüz açılır, veri gelince güncellenir.
- **Güvenlik**: her kullanıcı yalnızca yetkili olduğu veriyi görür; kurallar sunucu tarafında uygulanır. Veriler Google altyapısında (Avrupa bölgesi) tutulur, yedeklenir.
- **Bildirimler**: uygulama bildirimi standart; SMS ve e-posta entegrasyonu isteğe bağlı.
- **Entegrasyonlar (opsiyonel)**: sanal POS (banka / iyzico / PayTR), banka hesap hareketi eşleştirme, plaka tanıma / bariyer, akıllı kargo dolabı, muhasebe programı aktarımı.

## 6. Önerilen fazlama

| Faz | İçerik | Hedef |
|---|---|---|
| **Faz 1** | Aidat, tahsilat, ek ücretler, giderler, duyurular, talep & arıza, daireler/sakinler, belgeler, mesajlar, sakin portalı temel ekranları, PWA kurulumu | İlk 4–6 hafta |
| **Faz 2** | Rezervasyon, misafir, kargo, otopark, giriş-çıkış, anket, toplantı/karar, projeler, periyodik bakım, bütçe & raporlar | Sonraki 4–6 hafta |
| **Faz 3** | İhale, satınalma, tedarikçi/sözleşme, reklam alanları & süreçleri, hukuki takip, demirbaş, personel/vardiya, entegrasyonlar (POS, banka, plaka, SMS) | İhtiyaca göre |

Fazlar müşteriyle birlikte **Kapsam Mutabakatı** sayfasında netleştirilir; çıktı teklif/sözleşme ekine dönüşür.

## 7. Demo nasıl gösterilir?

1. Uygulamayı açın, **Site Yönetimi** ile girin: Genel Bakış → Aidat Takibi (bir daireye tıklayıp tahsilat kaydedin) → Talep & Arıza → Otopark → Kapsam Mutabakatı.
2. Sol alttan **Portal değiştir** ile **Sakin** tarafına geçin: Ana sayfa → Aidat & Borçlarım (kartla öde) → Misafir bildir → Rezervasyon.
3. Telefonda gösterirken "Uygulamayı yükle" çubuğunu kullanarak ana ekrana ekleyin.
4. Demo verisi tarayıcıda tutulur; Ayarlar › "Demo verisini sıfırla" ile başlangıca döner.
