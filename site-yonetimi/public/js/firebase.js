// Firebase SDK'yı yalnızca yapılandırma varsa, CDN'den dinamik olarak yükler.
import { firebaseConfig, useEmulators } from './firebase-config.js';

const VER = '12.4.0';
const cdn = (m) => `https://www.gstatic.com/firebasejs/${VER}/firebase-${m}.js`;

export const firebaseEnabled = !!firebaseConfig;
let ctx = null;

export async function initFirebase() {
  if (!firebaseEnabled) return null;
  if (ctx) return ctx;
  const [{ initializeApp }, auth, fs, st] = await Promise.all([
    import(cdn('app')), import(cdn('auth')), import(cdn('firestore')), import(cdn('storage')),
  ]);
  const app = initializeApp(firebaseConfig);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  const storage = st.getStorage(app);
  if (useEmulators) {
    auth.connectAuthEmulator(a, 'http://localhost:9099', { disableWarnings: true });
    fs.connectFirestoreEmulator(db, 'localhost', 8080);
    st.connectStorageEmulator(storage, 'localhost', 9199);
  }
  a.languageCode = 'tr';
  ctx = { app, auth: a, db, storage, mod: { auth, fs, st } };
  return ctx;
}
