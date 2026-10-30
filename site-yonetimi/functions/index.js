'use strict';

/**
 * Site Yönetimi – Cloud Functions (firebase-functions v2 API)
 * ----------------------------------------------------------
 * Bölge: europe-west1 (İstanbul'a en yakın Cloud Functions bölgesi)
 * Çalışma zamanı: Node.js 22 (package.json > engines)
 *
 * NOT: Cloud Functions dağıtımı için Blaze (kullandıkça öde) planı gerekir.
 * Faz 1'de ürün yalnızca Hosting + Auth + Firestore + Storage ile çalışır;
 * buradaki fonksiyonlar isteğe bağlı ek özelliklerdir:
 *
 *   setUserRole              – (onCall) kullanıcıya rol / site / daire claim'i atar
 *   generateMonthlyDues      – (zamanlanmış) her ayın 1'i 03:00'te aidat üretir
 *   onPaymentCreated         – (Firestore tetikleyici) tahsilatı aidata işler
 *   onAnnouncementPublished  – (Firestore tetikleyici) duyuru yayınlanınca FCM gönderir
 */

const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
// firebase-admin v14: yalnızca modüler API (admin.firestore() gibi ad alanı API'si kaldırıldı)
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

// Tüm fonksiyonlar için ortak ayarlar
setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
});

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Geçerli roller
const ROLES = ['superadmin', 'admin', 'staff', 'security', 'resident'];

// ---------------------------------------------------------------------
//  Yardımcılar
// ---------------------------------------------------------------------

/** İstanbul saatine göre YYYY-MM biçiminde dönem döndürür. */
function currentPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  return `${year}-${month}`;
}

/** Dönem (YYYY-MM) ve gün bilgisinden son ödeme tarihi üretir (UTC öğlen). */
function dueDateFor(period, dueDay) {
  const [year, month] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // ayın son günü
  const day = Math.min(Math.max(Number(dueDay) || 10, 1), lastDay);
  return Timestamp.fromDate(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

// ---------------------------------------------------------------------
//  setUserRole – Kullanıcıya claim atama (onCall)
// ---------------------------------------------------------------------
//  Girdi : { uid, role, siteId, unitId? }
//  Yetki : Çağıran, hedef sitenin yöneticisi (admin) ya da superadmin olmalı.
//          Yalnızca superadmin "superadmin" rolü verebilir.
//  Sonuç : Auth custom claims güncellenir ve users/{uid} belgesine yansıtılır.
// ---------------------------------------------------------------------
exports.setUserRole = onCall({ enforceAppCheck: false }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Oturum açmanız gerekiyor.');
  }

  const callerRole = auth.token.role || '';
  const callerSite = auth.token.siteId || '';
  const isSuper = callerRole === 'superadmin';

  const { uid, role, siteId } = request.data || {};
  const unitId = request.data && request.data.unitId ? String(request.data.unitId) : null;

  // --- Girdi doğrulama ---
  if (typeof uid !== 'string' || !uid) {
    throw new HttpsError('invalid-argument', 'uid zorunludur.');
  }
  if (!ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Geçersiz rol. Geçerli roller: ${ROLES.join(', ')}`);
  }
  if (typeof siteId !== 'string' || !siteId) {
    throw new HttpsError('invalid-argument', 'siteId zorunludur.');
  }

  // --- Yetki kontrolü ---
  if (!isSuper) {
    if (callerRole !== 'admin' || callerSite !== siteId) {
      throw new HttpsError('permission-denied', 'Bu site için yetkiniz yok.');
    }
    if (role === 'superadmin') {
      throw new HttpsError('permission-denied', 'Yalnızca superadmin bu rolü verebilir.');
    }
  }

  const siteSnap = await db.doc(`sites/${siteId}`).get();
  if (!siteSnap.exists) {
    throw new HttpsError('not-found', 'Site bulunamadı.');
  }

  if (unitId) {
    const unitSnap = await db.doc(`sites/${siteId}/units/${unitId}`).get();
    if (!unitSnap.exists) {
      throw new HttpsError('not-found', 'Daire (unit) bulunamadı.');
    }
  }

  // --- Claim'leri yaz ---
  const claims = { role, siteId };
  if (unitId) claims.unitId = unitId;

  let userRecord;
  try {
    userRecord = await getAuth().getUser(uid);
  } catch (err) {
    throw new HttpsError('not-found', 'Kullanıcı bulunamadı (Auth).');
  }
  await getAuth().setCustomUserClaims(uid, claims);

  // --- users/{uid} belgesine yansıt ---
  await db.doc(`users/${uid}`).set(
    {
      role,
      siteId,
      unitId: unitId || FieldValue.delete(),
      email: userRecord.email || null,
      name: userRecord.displayName || FieldValue.delete(),
      claimsUpdatedAt: FieldValue.serverTimestamp(),
      claimsUpdatedBy: auth.uid,
    },
    { merge: true },
  );

  logger.info('setUserRole', { by: auth.uid, uid, role, siteId, unitId });
  return { ok: true, uid, claims };
});

// ---------------------------------------------------------------------
//  generateMonthlyDues – Aylık aidat üretimi (zamanlanmış)
// ---------------------------------------------------------------------
//  Her ayın 1'i 03:00 (Europe/Istanbul). Her site için
//  sites/{siteId}/settings/dues belgesindeki { monthlyAmount, dueDay }
//  değerlerine göre, her daire için bir aidat belgesi oluşturur.
//  Belge kimliği `${unitId}_${period}` olduğu için tekrar çalıştırmak
//  güvenlidir (idempotent): var olan aidat yeniden yazılmaz.
// ---------------------------------------------------------------------
exports.generateMonthlyDues = onSchedule(
  { schedule: '0 3 1 * *', timeZone: 'Europe/Istanbul' },
  async () => {
    const period = currentPeriod();
    const sitesSnap = await db.collection('sites').get();
    let created = 0;
    let skipped = 0;

    for (const siteDoc of sitesSnap.docs) {
      const siteId = siteDoc.id;
      const settingsSnap = await db.doc(`sites/${siteId}/settings/dues`).get();
      if (!settingsSnap.exists) {
        logger.info('generateMonthlyDues: settings/dues yok, atlanıyor', { siteId });
        continue;
      }
      const settings = settingsSnap.data();
      const defaultAmount = Number(settings.monthlyAmount) || 0;
      const dueDay = Number(settings.dueDay) || 10;
      if (settings.enabled === false || defaultAmount <= 0) {
        logger.info('generateMonthlyDues: aidat üretimi kapalı veya tutar 0', { siteId });
        continue;
      }

      const unitsSnap = await db.collection(`sites/${siteId}/units`).get();
      const dueDate = dueDateFor(period, dueDay);

      // Firestore batch sınırı 500 işlem; parçalara ayırarak yazıyoruz
      let batch = db.batch();
      let ops = 0;

      for (const unitDoc of unitsSnap.docs) {
        const unit = unitDoc.data();
        if (unit.isActive === false) continue;

        const duesRef = db.doc(`sites/${siteId}/dues/${unitDoc.id}_${period}`);
        const existing = await duesRef.get();
        if (existing.exists) {
          skipped++;
          continue;
        }

        const amount = Number(unit.duesAmount) > 0 ? Number(unit.duesAmount) : defaultAmount;
        batch.set(duesRef, {
          unitId: unitDoc.id,
          blockId: unit.blockId || null,
          period,
          amount,
          paidAmount: 0,
          status: 'open',
          dueDate,
          description: `${period} dönemi aidatı`,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: 'system',
        });
        ops++;
        created++;

        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
    }

    logger.info('generateMonthlyDues tamamlandı', { period, created, skipped });
  },
);

// ---------------------------------------------------------------------
//  onPaymentCreated – Tahsilatı aidata işleme (Firestore tetikleyici)
// ---------------------------------------------------------------------
//  sites/{siteId}/payments/{paymentId} oluşturulduğunda, belgedeki
//  `duesId` alanının işaret ettiği aidat belgesinde paidAmount artırılır;
//  tutar tamamlanınca status 'paid', kısmi ödemede 'partial' olur.
// ---------------------------------------------------------------------
exports.onPaymentCreated = onDocumentCreated(
  'sites/{siteId}/payments/{paymentId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const payment = snap.data();
    const { siteId, paymentId } = event.params;

    const amount = Number(payment.amount);
    if (!payment.duesId || !(amount > 0)) {
      logger.warn('onPaymentCreated: duesId yok veya tutar geçersiz', { siteId, paymentId });
      return;
    }

    const duesRef = db.doc(`sites/${siteId}/dues/${payment.duesId}`);

    await db.runTransaction(async (tx) => {
      const duesSnap = await tx.get(duesRef);
      if (!duesSnap.exists) {
        logger.warn('onPaymentCreated: aidat belgesi bulunamadı', { siteId, duesId: payment.duesId });
        return;
      }
      const dues = duesSnap.data();

      // Aynı tahsilat iki kez işlenmesin (tetikleyici tekrarına karşı)
      const applied = Array.isArray(dues.paymentIds) ? dues.paymentIds : [];
      if (applied.includes(paymentId)) return;

      const total = Number(dues.amount) || 0;
      const paidAmount = (Number(dues.paidAmount) || 0) + amount;
      const status = paidAmount >= total ? 'paid' : 'partial';

      tx.update(duesRef, {
        paidAmount,
        status,
        paymentIds: FieldValue.arrayUnion(paymentId),
        lastPaymentAt: payment.paidAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Tahsilat belgesine de işlendi bilgisini yaz
      tx.update(snap.ref, {
        appliedToDues: true,
        appliedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info('onPaymentCreated: tahsilat işlendi', { siteId, paymentId, duesId: payment.duesId, amount });
  },
);

// ---------------------------------------------------------------------
//  onAnnouncementPublished – Duyuru bildirimi (Firestore tetikleyici)
// ---------------------------------------------------------------------
//  sites/{siteId}/announcements/{id} yazıldığında isPublished alanı
//  true olmuş ve pushSentAt henüz yoksa `site_${siteId}` FCM konusuna
//  bildirim gönderilir. FCM yapılandırılmamışsa hata yutulur, belge
//  yine de işaretlenir ki tekrar denenmesin.
// ---------------------------------------------------------------------
exports.onAnnouncementPublished = onDocumentWritten(
  'sites/{siteId}/announcements/{announcementId}',
  async (event) => {
    const after = event.data && event.data.after;
    if (!after || !after.exists) return; // silinmiş

    const data = after.data();
    const before = event.data.before && event.data.before.exists ? event.data.before.data() : null;
    const { siteId, announcementId } = event.params;

    const becamePublished = data.isPublished === true && !(before && before.isPublished === true);
    if (!becamePublished || data.pushSentAt) return;

    const topic = `site_${siteId}`;
    const message = {
      topic,
      notification: {
        title: String(data.title || 'Yeni duyuru'),
        body: String(data.summary || data.body || '').slice(0, 200),
      },
      data: {
        type: 'announcement',
        siteId,
        announcementId,
        url: `/duyurular/${announcementId}`,
      },
    };

    let pushResult = null;
    try {
      pushResult = await getMessaging().send(message);
      logger.info('onAnnouncementPublished: bildirim gönderildi', { siteId, announcementId, pushResult });
    } catch (err) {
      // Messaging yapılandırılmamış olabilir; bu bir hata değil, uyarıdır
      logger.warn('onAnnouncementPublished: FCM gönderilemedi', {
        siteId,
        announcementId,
        error: err && err.message,
      });
    }

    await after.ref.set(
      {
        pushSentAt: FieldValue.serverTimestamp(),
        pushTopic: topic,
        pushMessageId: pushResult || null,
      },
      { merge: true },
    );
  },
);
