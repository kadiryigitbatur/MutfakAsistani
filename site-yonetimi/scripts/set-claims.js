'use strict';

/**
 * set-claims.js – Bir kullanıcıya rol / site / daire claim'i atar.
 * -----------------------------------------------------------------
 * Kullanım:
 *   node set-claims.js <uid> <siteId> <role> [unitId]
 *
 * Örnek (ilk yönetici):
 *   node set-claims.js Abc123Uid demo-site admin
 * Örnek (sakin):
 *   node set-claims.js Xyz456Uid demo-site resident A-3
 *
 * Kimlik doğrulama (birini seçin):
 *   1) Gerçek proje: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *      (Firebase Console > Proje Ayarları > Hizmet hesapları > Yeni özel anahtar)
 *      ve GCLOUD_PROJECT=<proje-id> (ya da FIREBASE_PROJECT)
 *   2) Emülatör: FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 *                FIRESTORE_EMULATOR_HOST=localhost:8080
 *                GCLOUD_PROJECT=sitem-54bfe
 *
 * Betik hem Auth custom claims'i yazar hem de users/{uid} belgesine
 * (siteId, role, unitId) alanlarını merge eder.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const ROLES = ['superadmin', 'admin', 'staff', 'security', 'resident'];

function usage(msg) {
  if (msg) console.error(`Hata: ${msg}\n`);
  console.error('Kullanım: node set-claims.js <uid> <siteId> <role> [unitId]');
  console.error(`Roller  : ${ROLES.join(' | ')}`);
  process.exit(1);
}

async function main() {
  const [uid, siteId, role, unitId] = process.argv.slice(2);
  if (!uid || !siteId || !role) usage('Eksik parametre.');
  if (!ROLES.includes(role)) usage(`Geçersiz rol: ${role}`);

  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT;
  const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    usage('GOOGLE_APPLICATION_CREDENTIALS tanımlı değil (ya da emülatör için FIREBASE_AUTH_EMULATOR_HOST).');
  }

  initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });

  const auth = getAuth();
  const db = getFirestore();

  const user = await auth.getUser(uid).catch(() => null);
  if (!user) usage(`Auth'ta kullanıcı bulunamadı: ${uid}`);

  const claims = { role, siteId };
  if (unitId) claims.unitId = unitId;

  await auth.setCustomUserClaims(uid, claims);

  await db.doc(`users/${uid}`).set(
    {
      role,
      siteId,
      unitId: unitId || FieldValue.delete(),
      email: user.email || null,
      ...(user.displayName ? { name: user.displayName } : {}),
      claimsUpdatedAt: FieldValue.serverTimestamp(),
      claimsUpdatedBy: 'script:set-claims',
    },
    { merge: true },
  );

  console.log(`Tamam: ${user.email || uid} -> ${JSON.stringify(claims)}`);
  console.log('Not: Kullanıcı yeni claim\'leri görmek için çıkış yapıp tekrar giriş yapmalı');
  console.log('     (ya da istemcide getIdToken(true) çağrılmalı).');
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err.message || err);
  process.exit(1);
});
