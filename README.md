# Mutfak Asistanı – Android

Elindeki malzemeleri yaz, yapay zekâ sana uyan tarifleri çıkarsın. WebView tabanlı Android uygulaması.

## Ücretsiz / Pro

| | Ücretsiz | Pro (tek seferlik) |
|---|---|---|
| Tarif arama | Günde 3 | Sınırsız |
| Sonuç sayısı | 6 | 6 / 9 / 12 |
| Favoriler | 10 | Sınırsız |
| Pişirme modu, sayaç, alışveriş listesi, YouTube, filtreler, tema, TR/EN | ✓ | ✓ |
| Besin değerleri (protein / karbonhidrat / yağ) | – | ✓ |
| Tarif varyasyonları (vegan, 20 dk, baharatlı, çocuk dostu, yüksek protein, hafif) | – | ✓ |
| Haftalık yemek planı + eksikleri tek dokunuşla listeye | – | ✓ |
| Kayıtlı kilerler | – | ✓ |
| Yedekle / geri yükle | – | ✓ |

Kurallar `index.html` içindeki `LIMITS` sabitinde: `freeSearchesPerDay`, `freeFavs`, `hardCapPerDay` (anahtarı korumak için herkese geçerli günlük üst sınır).
Kendi Gemini anahtarını giren kullanıcıda günlük arama sınırı uygulanmaz (maliyet ona ait).

Satın alma ekranı asla kendiliğinden açılmaz; yalnızca kullanıcı bir Pro özelliğine dokununca ya da günlük hakkı bitince görünür.

## Google Play'de satışa hazırlık

1. **Play Console** hesabı aç (tek seferlik 25 USD).
2. Uygulamayı oluştur, **Para kazanma › Ürünler › Uygulama içi ürünler**'den ürün ekle:
   ürün kimliği **`pro_lifetime`** (koddaki `BillingManager.PRODUCT_ID` ile aynı olmalı), fiyatı belirle, etkinleştir.
3. Actions'tan inen **`MutfakAsistani-aab-PlayStore`** dosyasını (.aab) **Dahili test** kanalına yükle. Play, ilk yüklemede imza anahtarını kaydeder; `app/release.keystore` ve şifresini kaybetme.
4. **Lisans test kullanıcıları**na kendi Gmail'ini ekle; test sırasında ücretsiz satın alım yapabilirsin.
5. Mağaza kaydı için gizlilik politikası sayfası gerekir (uygulama yalnızca malzeme listesini Google Gemini API'sine gönderir, başka veri toplamaz).

Satın alma akışı: `BillingManager.kt` → `window.onProChanged(true)` → arayüz Pro'ya geçer. Durum cihazda saklanır; "Satın alımı geri yükle" Play'den tekrar sorgular.

## Promosyon kodu

Pro ekranındaki kod alanı, kodun SHA-256 özetini `PROMO_HASHES` listesiyle karşılaştırır. Yeni kod eklemek için:
`printf "%s" "KODUN" | sha256sum` çıktısını listeye ekle. Kodlar büyük harfe çevrilerek karşılaştırılır.
Not: Bu basit bir yöntemdir; kod bir kez sızarsa herkes kullanabilir. Çok sayıda kullanıcıya dağıtmak için Play Console'daki promosyon kodlarını tercih et.

## Derleme

GitHub Actions her push'ta APK ve AAB üretir. Gerekli gizli değerler: `GEMINI_API_KEY`, `KEYSTORE_PASSWORD`.
Yerelde: Android Studio ile aç ya da `./gradlew assembleRelease`.
