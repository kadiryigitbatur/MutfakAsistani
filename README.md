# Mutfak Asistanı – Android

HTML sürümünün Android uygulaması (WebView). Tüm özellikler aynı; ek olarak:
geri tuşu açık pencereyi kapatır, pişirme modunda ekran kapanmaz, sayaç bitince telefon titrer,
kopyala ve yazdır Android'in kendi pano/yazdırma servislerini kullanır, dış bağlantılar tarayıcıda açılır.

## APK'yı bilgisayarsız almak (GitHub)
1. github.com'da yeni bir depo oluştur.
2. Bu klasördeki tüm dosyaları (gizli `.github` klasörü dahil) depoya yükle.
3. **Actions** sekmesinde "APK derle" çalışır (~5 dk).
4. Bitince çalıştırmayı aç → **Artifacts** altındaki `MutfakAsistani-apk`'yı indir, zip'ten çıkar, telefonda aç
   (bilinmeyen kaynaklardan yüklemeye izin vermen istenir).

## Android Studio ile
Klasörü aç → Build › Build APK(s). Ya da: `./gradlew assembleRelease`

API anahtarı yine uygulamanın Ayarlar ekranından girilir, sadece telefonda saklanır.
