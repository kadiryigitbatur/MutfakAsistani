# Site Yönetimi – Firebase Kurulum Rehberi (PC Aşaması)

Bu rehber, projeyi kendi bilgisayarınızda Firebase'e bağlayıp yayına almak için
izlenecek adımları **sırasıyla** anlatır. Depodaki tüm Firebase yapılandırması
(`firebase.json`, kurallar, indeksler, fonksiyonlar, betikler) hazırdır; sizin
yapmanız gereken yalnızca Firebase projesini oluşturup bağlamaktır.

> **Faz 1 hedefi:** Hosting + Auth + Firestore + Storage ile ürün tamamen çalışır.
> Cloud Functions (aidat üretimi, bildirim vb.) **isteğe bağlıdır** ve Blaze planı ister.

---

## 0. Özet (hızlı yol)

```bash
npm i -g firebase-tools
firebase login
cd site-yonetimi
# Konsolda proje oluşturun, web uygulaması kaydedin, config'i yapıştırın (adım 3-5)
firebase use --add            # projeyi seçin, takma ad: default
firebase deploy --only hosting
firebase deploy --only firestore:rules,firestore:indexes,storage
# (Blaze sonrası) firebase deploy --only functions
```

---

## 1. Gerekli araçlar

1. **Node.js LTS** (22 veya üzeri): <https://nodejs.org> → "LTS" indirin ve kurun.
   Kurulumu doğrulayın:
   ```bash
   node -v     # v22.x.x
   npm -v
   ```
2. **Firebase CLI**:
   ```bash
   npm i -g firebase-tools
   firebase --version
   ```
3. **Java 11+** (yalnızca yerel emülatör için gerekir): <https://adoptium.net>
4. (İsteğe bağlı) **Git** ve bir kod editörü (VS Code).

## 2. Firebase hesabına giriş

```bash
firebase login
```
Tarayıcı açılır, Google hesabınızla giriş yapın. `firebase projects:list` ile
erişebildiğiniz projeleri görebilirsiniz.

## 3. Firebase projesi oluşturma (Konsol)

1. <https://console.firebase.google.com> → **Proje ekle**.
2. Proje adı: örn. `site-yonetimi` (Firebase size `site-yonetimi-xxxxx` gibi bir
   **proje kimliği** verir; bunu not edin).
3. Google Analytics: isteğe bağlı (kapatabilirsiniz).
4. Proje oluşturulduktan sonra sol menüden sırayla aşağıdaki servisleri açın.

### 3a. Authentication
- **Build → Authentication → Get started**
- **Sign-in method** sekmesinde şunları etkinleştirin:
  - **E-posta/Şifre**
  - **Google** (destek e-postası seçin, kaydedin)
- **Settings → Authorized domains**: özel alan adı kullanacaksanız buraya ekleyin
  (`*.web.app` ve `*.firebaseapp.com` zaten eklidir).

### 3b. Firestore Database
- **Build → Firestore Database → Create database**
- Konum: **`eur3 (europe-west)`** çoklu bölge ya da **`europe-west1 (Belçika)`**.
  Türkiye için en düşük gecikme bu bölgelerdedir. *Konum sonradan değiştirilemez.*
- Mod: **Production mode** (kurallar depodan dağıtılacak; test modunu seçmeyin).

### 3c. Storage
- **Build → Storage → Get started**
- Production mode; konum Firestore ile aynı bölge.
- Not: Yeni projelerde Storage için de Blaze planı istenebilir. İstenirse Storage'ı
  Blaze'e geçene kadar atlayın; uygulama dosya yükleme dışında çalışmaya devam eder.

### 3d. (Sonra) Cloud Functions
- Üst menüden **Upgrade → Blaze** planına geçtikten sonra kullanılabilir.
  Ücretsiz kota geniştir; küçük bir site için aylık maliyet genellikle 0 TL'ye yakındır.
  Yine de bir **bütçe uyarısı** tanımlamanız önerilir (Google Cloud → Billing → Budgets).

## 4. Web uygulamasını kaydetme ve config'i yapıştırma

1. Konsolda **Proje Ayarları (dişli) → Genel → Uygulamalarınız → `</>` (Web)**.
2. Takma ad: `site-yonetimi-web`. **Firebase Hosting'i de ayarla** kutusunu işaretleyin.
3. Size şu biçimde bir yapılandırma gösterilir:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "site-yonetimi-xxxxx.firebaseapp.com",
     projectId: "site-yonetimi-xxxxx",
     storageBucket: "site-yonetimi-xxxxx.appspot.com",   // ya da ...firebasestorage.app
     messagingSenderId: "...",
     appId: "..."
   };
   ```
4. Bu nesneyi **`public/js/firebase-config.js`** dosyasına yapıştırın. Dosya bir
   ES modülüdür ve şu şekilde dışa aktarır:
   ```js
   // public/js/firebase-config.js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   - Değer **`null`** ise (`export const firebaseConfig = null;`) uygulama
     **demo modunda** çalışır: Firebase'e bağlanmaz, örnek verileri tarayıcıda gösterir.
   - Bu anahtarlar gizli değildir (tarayıcıya zaten gider); güvenlik Firestore/Storage
     kuralları ve Auth ile sağlanır. Yine de alan adı kısıtlaması için Google Cloud
     Console'da API anahtarını `*.web.app` ve kendi alan adınızla sınırlayabilirsiniz.

## 5. Projeyi CLI'ya bağlama

`site-yonetimi/.firebaserc` dosyasında `"default": "site-yonetimi-demo"` yalnızca
bir **yer tutucudur**. Gerçek projenizi bağlamak için:

```bash
cd site-yonetimi
firebase use --add
# Listeden projenizi seçin, takma ad olarak "default" yazın
firebase use          # aktif projeyi gösterir
```
Bu komut `.firebaserc` dosyasını otomatik günceller.

## 6. Yerel test (emülatör)

```bash
cd site-yonetimi
firebase emulators:start
```
- Uygulama: <http://localhost:5000>
- Emülatör arayüzü (veri, kullanıcı, kural inceleme): <http://localhost:4000>
- Portlar: Auth 9099, Firestore 8080, Hosting 5000, Functions 5001, Storage 9199.

Ön yüz, `localhost` üzerinde çalışırken emülatörlere bağlanacak şekilde
ayarlanmışsa (`connectAuthEmulator` vb.) gerçek projeye hiç dokunmadan test
edebilirsiniz. Emülatöre demo veri basmak için:

```bash
cd scripts && npm install
FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=site-yonetimi-demo node seed-demo.js
```
> Windows PowerShell'de ortam değişkenleri şöyle verilir:
> `$env:FIRESTORE_EMULATOR_HOST="localhost:8080"; $env:GCLOUD_PROJECT="site-yonetimi-demo"; node seed-demo.js`

Emülatör verisini oturumlar arasında saklamak için:
`firebase emulators:start --import=./.emulator-data --export-on-exit`

## 7. Yayına alma (deploy)

Adım adım, her seferinde yalnızca bir parçayı dağıtmak hataları ayıklamayı kolaylaştırır.

```bash
# 7a. Önce yalnızca web sitesi
firebase deploy --only hosting
# Çıktıdaki URL: https://<proje-id>.web.app

# 7b. Güvenlik kuralları ve indeksler
firebase deploy --only firestore:rules,firestore:indexes,storage

# 7c. (Blaze planına geçtikten sonra) fonksiyonlar
cd functions && npm install && cd ..
firebase deploy --only functions
```
İlk fonksiyon dağıtımı birkaç dakika sürebilir ve gerekli Google Cloud API'lerini
(Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler) kendisi etkinleştirir.
Zamanlanmış fonksiyon (`generateMonthlyDues`) için **Cloud Scheduler** de bu
sırada açılır.

Hepsini birden: `firebase deploy`

## 8. İlk yönetici kullanıcıyı oluşturma

Kurallar gereği hiç kimse kendi rolünü atayamaz; ilk yöneticiyi sunucu tarafından
siz tanımlarsınız.

1. **Auth'ta kullanıcı açın:** Konsol → Authentication → Users → **Add user**
   (e-posta + şifre). Oluşan **UID**'yi kopyalayın.
2. **Site belgesini oluşturun:** Firestore'da `sites/<siteId>` belgesi olmalı.
   En kolayı demo veriyi basmak (adım 3) ya da konsoldan elle
   `sites/benim-sitem` belgesi (`name` alanı) oluşturmak.
3. **Hizmet hesabı anahtarı indirin:** Proje Ayarları → **Hizmet hesapları** →
   **Yeni özel anahtar oluştur** → dosyayı `site-yonetimi/scripts/serviceAccountKey.json`
   olarak kaydedin (bu dosya `.gitignore`'dadır; **asla paylaşmayın**).
4. **Claim atayın:**
   ```bash
   cd site-yonetimi/scripts
   npm install
   # macOS / Linux
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json GCLOUD_PROJECT=<proje-id> \
     node set-claims.js <UID> <siteId> admin
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"; $env:GCLOUD_PROJECT="<proje-id>"
   node set-claims.js <UID> <siteId> admin
   ```
   Betik hem Auth custom claim'lerini (`role`, `siteId`, isteğe bağlı `unitId`) yazar
   hem de `users/<UID>` belgesini oluşturur/günceller.
5. Kullanıcı uygulamada **çıkış yapıp tekrar giriş yapmalıdır** (claim'ler yeni
   ID token ile gelir).
6. Bundan sonra diğer kullanıcılar, yönetici hesabıyla uygulama içinden
   (`setUserRole` fonksiyonu, Blaze gerektirir) ya da aynı betikle yetkilendirilir:
   ```bash
   node set-claims.js <UID> <siteId> resident A-3      # sakin, daire A-3
   node set-claims.js <UID> <siteId> security          # güvenlik
   ```

**Demo veri (gerçek projeye):**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json GCLOUD_PROJECT=<proje-id> node seed-demo.js demo-site
```

## 9. Özel alan adı

Hosting → **Add custom domain** → alan adınızı yazın → verilen TXT ve A kayıtlarını
alan adı sağlayıcınızın DNS paneline ekleyin. SSL sertifikası otomatik üretilir
(24 saate kadar sürebilir). Ardından Authentication → Authorized domains listesine
de alan adını ekleyin.

## 10. PWA (telefona yükleme) notu

- PWA kurulumu ve Service Worker yalnızca **HTTPS** üzerinde çalışır;
  Firebase Hosting bunu otomatik sağlar (`localhost` da istisna olarak çalışır).
- `firebase.json` içindeki başlıklar:
  - `sw.js` ve `index.html` → `no-cache` (yeni sürüm hemen görülsün).
  - `/js/**` → **`no-cache`**: Geliştirme aşamasında dosya adlarında sürüm/hash
    kullanılmadığı için uzun önbellek, kullanıcıların eski JavaScript'i görmesine
    yol açar. Sürümlü dosya adlarına (`app.abc123.js`) geçildiğinde uzun önbelleğe alınabilir.
  - `/css/**` ve `/icons/**` → 1 yıl `immutable`. **Dikkat:** CSS dosyasını
    değiştirirseniz adını ya da `?v=2` gibi sorgu parametresini de değiştirin;
    aksi halde tarayıcı eski CSS'i gösterir. Sık CSS değişikliği yapıyorsanız bu
    başlığı da `no-cache` yapın.
- Android/Chrome: adres çubuğu → "Ana ekrana ekle". iOS/Safari: Paylaş → "Ana Ekrana Ekle".

## 11. Sorun giderme

| Belirti | Olası neden / çözüm |
|---|---|
| `firebase: command not found` | `npm i -g firebase-tools` sonrası terminali yeniden açın; Windows'ta PowerShell betik izni için `Set-ExecutionPolicy RemoteSigned`. |
| `Error: No project active` | `firebase use --add` ile proje seçin. |
| `HTTP Error: 403 ... billing account` / Functions dağıtılmıyor | Blaze planına geçin. Faz 1'de `--only hosting,firestore,storage` ile devam edin. |
| `Missing or insufficient permissions` | Kullanıcının claim'i yok ya da yanlış site. `set-claims.js` çalıştırın, çıkış/giriş yapın. Konsolda Auth → kullanıcı → "Custom claims" alanından doğrulayın. |
| Sorgu `The query requires an index` hatası veriyor | Hata mesajındaki bağlantıya tıklayın ya da indeksi `firestore.indexes.json`'a ekleyip `firebase deploy --only firestore:indexes` çalıştırın. |
| Emülatör `Could not spawn java` | Java 11+ kurun ve PATH'e ekleyin. |
| Emülatör port çakışması | `firebase.json > emulators` altındaki portları değiştirin. |
| Tarayıcı eski sürümü gösteriyor | Service worker önbelleği: DevTools → Application → "Unregister" ya da sayfayı Ctrl+Shift+R ile yenileyin. `sw.js` içindeki sürüm sabitini artırın. |
| Google ile giriş `auth/unauthorized-domain` | Authentication → Settings → Authorized domains listesine alan adını ekleyin. |
| Storage yüklemesi reddediliyor | Dosya türü (görsel/PDF) ve boyut sınırını (talep ekleri 10 MB) kontrol edin; avatar için `customMetadata.siteId` gönderilmeli. |
| `firebase deploy` sırasında `functions/node_modules` yok uyarısı | `cd functions && npm install`. |
| Zamanlanmış fonksiyon çalışmıyor | Cloud Scheduler API etkin mi? `sites/<siteId>/settings/dues` belgesi (`monthlyAmount`, `dueDay`) var mı? Logs: `firebase functions:log`. |

## 12. Yararlı komutlar

```bash
firebase projects:list                 # projeler
firebase use <takma-ad>                # proje değiştir
firebase hosting:channel:deploy test   # geçici önizleme URL'si
firebase functions:log                 # fonksiyon günlükleri
firebase firestore:indexes             # mevcut indeksleri listele
firebase emulators:start --only hosting,firestore,auth
```
