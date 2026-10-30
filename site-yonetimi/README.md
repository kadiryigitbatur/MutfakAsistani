# Site Yönetimi — Firebase tabanlı site yönetimi ve sakin portalı

Yönetim ve sakinler için tek uygulama: aidat, ek ücretler, tahsilat, giderler, projeler, ihaleler,
satınalma, reklam alanları, otopark, giriş-çıkış, ortak alan rezervasyonu, duyurular, talepler,
anketler, belgeler, mesajlar ve daha fazlası. Responsive, telefona/masaüstüne yüklenebilen PWA.

## Klasörler

| Yol | İçerik |
|---|---|
| `public/` | Web uygulaması (saf HTML/CSS/JS, derleme gerektirmez). Firebase Hosting buradan yayınlar. |
| `public/js/firebase-config.js` | Firebase web yapılandırması. `null` iken **demo modu** (veriler tarayıcıda). |
| `public/js/modules.js` | Modül kayıtları: her modülün koleksiyonu, sütunları, form alanları, durumları. |
| `public/js/views.js` | Özel ekranlar: paneller, aidat, otopark, anket, mesaj, kapsam mutabakatı, ayarlar. |
| `public/js/store.js` | Veri katmanı: aynı arayüzle Demo (localStorage) veya Firestore. |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Güvenlik kuralları ve indeksler (rol ve site bazlı). |
| `functions/` | Cloud Functions: rol atama, aylık aidat üretimi, ödeme eşleştirme, duyuru bildirimi (Blaze planı gerekir, opsiyonel). |
| `scripts/` | İlk yönetici için claim atama ve demo veri yükleme betikleri. |
| `docs/KONSEPT.md` | Müşteriye sunulacak ürün konsepti ve kapsam listesi. |
| `docs/KURULUM.md` | PC'de Firebase CLI ile kurulum ve yayın adımları. |
| `docs/VERI-MODELI.md` | Koleksiyonlar, alanlar, roller, indeksler. |

## Hemen çalıştırma (demo modu)

Derleme yok; herhangi bir statik sunucu yeterli:

```bash
cd site-yonetimi/public
python3 -m http.server 8080      # veya: npx serve .
# http://localhost:8080
```

Firebase CLI ile: `cd site-yonetimi && firebase emulators:start --only hosting` → <http://localhost:5000>

Giriş ekranında **Site Yönetimi**, **Sakin** veya **Güvenlik** seçin. Demo verisi (Yeşil Vadi Sitesi,
4 blok, 96 daire) tarayıcıda tutulur; Ayarlar › "Demo verisini sıfırla" ile başa döner.

## Firebase'e bağlama ve yayın

Adım adım: [`docs/KURULUM.md`](docs/KURULUM.md). Özet:

```bash
npm i -g firebase-tools && firebase login
cd site-yonetimi
firebase use --add                                  # konsolda oluşturduğunuz projeyi seçin
# Web uygulaması config'ini public/js/firebase-config.js içine yapıştırın
firebase deploy --only hosting
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions                     # Blaze planına geçtikten sonra
```

## Mimari notlar

- **Çok kiracılı**: tüm veriler `sites/{siteId}/...` altında; kullanıcı rolü ve sitesi Auth custom claim'lerinde taşınır.
- **Roller**: superadmin, admin, staff, security, resident. Sakin yalnızca kendi dairesinin (unitId) verisini görür.
- **Modül eklemek**: `modules.js` içine bir kayıt eklemek yeterli; liste/kart/detay/form otomatik üretilir. Özel ekran gerekiyorsa `views.js` içine fonksiyon yazıp `view:` ile bağlayın.
- **PWA**: `manifest.webmanifest` + `sw.js`. HTTPS (Firebase Hosting) altında tarayıcı yükleme teklifi gösterir; uygulama içi "Uygulamayı yükle" çubuğu da vardır.
