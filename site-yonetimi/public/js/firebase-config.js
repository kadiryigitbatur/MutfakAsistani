// Firebase web yapılandırması.
// null → DEMO MODU: veriler tarayıcıda (localStorage) tutulur, sunucu gerekmez.
// Firebase Console › Proje ayarları › Web uygulaması bölümündeki nesneyi buraya yapıştırınca
// uygulama otomatik olarak Firebase Auth + Firestore ile çalışmaya başlar.
//
// export const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "proje-id.firebaseapp.com",
//   projectId: "proje-id",
//   storageBucket: "proje-id.firebasestorage.app",
//   messagingSenderId: "...",
//   appId: "..."
// };
export const firebaseConfig = null;

// Yerel emülatörlere bağlanmak için true yapın (firebase emulators:start)
export const useEmulators = false;
