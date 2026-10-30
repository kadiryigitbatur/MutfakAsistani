# Site Yönetimi – Veri Modeli

Bu belge Firestore veri yapısını, rolleri, güvenlik tasarımını ve indeksleri
tanımlar. Alan adları **İngilizce camelCase**, açıklamalar Türkçedir.
Ortak alanlar aksi belirtilmedikçe her belgede bulunur:

| Alan | Tür | Açıklama |
|---|---|---|
| `createdAt` | timestamp | Oluşturulma zamanı (`serverTimestamp()`) |
| `createdBy` | string | Oluşturan kullanıcının `uid`'si (`'system'` / `'seed'` olabilir) |
| `updatedAt` | timestamp | Son güncelleme (isteğe bağlı) |

---

## 1. Çok kiracılı (multi-tenant) tasarım

```
sites/{siteId}                       # site belgesi
sites/{siteId}/blocks/{blockId}      # siteye ait her koleksiyon site belgesinin altında
sites/{siteId}/units/{unitId}
sites/{siteId}/dues/{duesId}
...                                  # (aşağıdaki tüm koleksiyonlar)
users/{uid}                          # kullanıcı profilleri (site'lar arası, üstte)
```

- Her site (apartman / toplu konut) tamamen kendi alt ağacında yaşar; bir sitenin
  kullanıcısı başka sitenin verisine **yol üzerinden** bile erişemez.
- Kullanıcının hangi siteye ait olduğu Firestore belgesinden değil, **Auth custom
  claim**'inden (`siteId`) okunur. Böylece kurallar ek okuma (`get()`) yapmadan,
  hızlı ve ucuz çalışır.
- `users` koleksiyonu üst düzeydedir, çünkü kullanıcı kimliği (uid) sitelerden
  bağımsızdır ve bir kişi ileride başka siteye taşınabilir.

## 2. Roller ve claim'ler

Auth ID token'ına eklenen custom claim'ler:

| Claim | Tür | Açıklama |
|---|---|---|
| `siteId` | string | Kullanıcının bağlı olduğu site |
| `role` | string | `superadmin` \| `admin` \| `staff` \| `security` \| `resident` |
| `unitId` | string | Sakinler için daire kimliği (ör. `A-3`); personelde yok |

| Rol | Kimdir | Yetki özeti |
|---|---|---|
| `superadmin` | SaaS sahibi | Tüm sitelerde her şey; site oluşturma/silme |
| `admin` | Site yöneticisi | Kendi sitesinde her koleksiyonu okur/yazar, kullanıcı yetkilendirir |
| `staff` | Personel (kapıcı, teknisyen) | Operasyon kayıtları (giriş/çıkış, kargo, ziyaretçi, talep durumu, bakım) |
| `security` | Güvenlik | `staff` ile aynı operasyon yetkileri |
| `resident` | Sakin (malik/kiracı) | Kendi dairesine ait verileri okur; talep, ziyaretçi, rezervasyon, oy, ilan oluşturur |

Claim atama yolları:
1. `scripts/set-claims.js` (hizmet hesabı ile, ilk yönetici için)
2. Cloud Function `setUserRole` (uygulama içinden, admin/superadmin çağırır)

Claim değişince kullanıcı **yeniden giriş yapmalı** ya da `getIdToken(true)` çağrılmalı.

### Kural yardımcıları (firestore.rules)
`isSignedIn()`, `sameSite(siteId)`, `hasRole([...])`, `isAdmin()`, `isStaffLike()`,
`isSiteMember(siteId)`, `ownsUnit(data)`, `ownsDoc(data)`, `untouched([...])`.
Varsayılan: **her şey yasak**. Yönetici kendi sitesindeki tüm koleksiyonları genel
kuralla yönetir; diğer roller için koleksiyon bazlı özel kurallar vardır.

> **Sorgu notu:** Kurallar "kayıt bazında filtre" yapmaz. Sakin olarak `dues`
> listelerken sorguya `where('unitId','==',myUnitId)`; duyurularda
> `where('isPublished','==',true)`; belgelerde `where('isPublic','==',true)`
> eklenmelidir, aksi halde sorgu tamamen reddedilir.

---

## 3. Üst düzey koleksiyonlar

### `users/{uid}` – Kullanıcı profili
| Alan | Tür | Açıklama |
|---|---|---|
| `siteId` | string | Bağlı site (claim ile aynı, yalnızca admin/fonksiyon yazar) |
| `role` | string | Rol (claim ile aynı, yalnızca admin/fonksiyon yazar) |
| `unitId` | string? | Daire (sakin) |
| `name` | string | Ad Soyad |
| `phone` | string | Telefon (+90…) |
| `email` | string | E-posta |
| `photoUrl` | string? | Profil fotoğrafı (Storage `users/{uid}/avatar`) |
| `fcmTokens` | string[]? | Push bildirim token'ları |
| `claimsUpdatedAt` | timestamp | Son claim güncelleme zamanı |

Kurallar: kullanıcı kendi belgesini okur/günceller (ama `role`, `siteId`, `unitId`
alanlarına dokunamaz); admin ve personel aynı sitedeki profilleri okur.

### `sites/{siteId}` – Site
| Alan | Tür | Açıklama |
|---|---|---|
| `name` | string | Site adı |
| `address`, `city` | string | Adres |
| `phone` | string | Yönetim telefonu |
| `unitCount` | number | Daire sayısı |
| `isActive` | boolean | Aktif mi |
| `plan` | string | SaaS planı (`demo`, `basic`, `pro`) |
| `logoUrl` | string? | Logo |

---

## 4. Site alt koleksiyonları (`sites/{siteId}/…`)

### 4.1 Yapı

**`blocks/{blockId}`** – Blok
`name` (string), `floors` (number), `unitCount` (number), `order` (number).

**`units/{unitId}`** – Bağımsız bölüm / daire (önerilen id: `A-3`)
`blockId` (string, zorunlu), `number` (string, zorunlu), `floor` (number), `type` (`2+1`),
`areaM2` (number), `occupancy` (`owner` \| `tenant` \| `empty`), `ownerName`, `ownerPhone`,
`duesAmount` (number? – site varsayılanını ezer), `isActive` (boolean).

**`residents/{residentId}`** – Sakin kişi kaydı (uygulama kullanıcısı olmak zorunda değil)
`unitId`, `name`, `phone`, `email?`, `relation` (`owner` \| `tenant` \| `family`),
`isPrimary` (boolean), `moveInDate`, `moveOutDate?`, `uid?` (varsa Auth kullanıcısı).

**`vehicles/{vehicleId}`** – Araç
`unitId`, `plate` (string, zorunlu), `brand`, `model`, `color`, `parkingSpotId?`.

### 4.2 Finans

**`dues/{duesId}`** – Aidat (id: `${unitId}_${period}`; `generateMonthlyDues` üretir)
`unitId` (string), `blockId`, `period` (`YYYY-MM`), `amount` (number > 0),
`paidAmount` (number), `status` (`open` \| `partial` \| `paid` \| `cancelled`),
`dueDate` (timestamp), `description`, `paymentIds` (string[]), `lastPaymentAt?`.

**`payments/{paymentId}`** – Tahsilat (`onPaymentCreated` aidata işler)
`unitId`, `duesId` (işlenecek aidat), `amount` (number > 0), `currency` (`TRY`),
`method` (`cash` \| `bank` \| `card` \| `online`), `paidAt` (timestamp), `receivedBy` (uid),
`note?`, `appliedToDues` (boolean), `appliedAt?`.

**`extraCharges/{chargeId}`** – Ek ücret (demirbaş, ceza, onarım payı)
`unitId`, `title`, `amount` (number > 0), `status` (`open` \| `paid`), `dueDate`, `description?`.

**`expenses/{expenseId}`** – Gider (yalnızca yönetici)
`title`, `category` (`maintenance` \| `utility` \| `staff` \| `cleaning` \| `insurance` \| `other`),
`amount`, `paidAt`, `supplierId?`, `invoiceNo?`, `documentId?`, `status` (`planned` \| `paid`).

**`budgets/{budgetId}`** – Bütçe (id: yıl; üyeler okur)
`year` (number), `totalIncome`, `totalExpense`, `items[]` (`{category, planned, actual?}`), `approvedAt?`.

### 4.3 Proje, ihale, satın alma (yönetici)

**`projects/{projectId}`** – Proje (üyeler özet okur)
`title`, `description`, `status` (`planned` \| `tender` \| `in_progress` \| `done`),
`budget` (number), `spent` (number), `startsAt`, `endsAt`, `progress` (0-100).

**`tenders/{tenderId}`** – İhale: `projectId`, `title`, `deadline`, `status` (`open` \| `closed` \| `awarded`), `awardedBidId?`.

**`bids/{bidId}`** – Teklif: `tenderId`, `supplierId`, `amount`, `validUntil`, `fileId?`, `notes`.

**`purchases/{purchaseId}`** – Satın alma: `title`, `supplierId`, `amount`, `orderedAt`, `deliveredAt?`, `status`.

**`suppliers/{supplierId}`** – Tedarikçi: `name`, `phone`, `email`, `category`, `taxNo?`, `rating?`.

**`contracts/{contractId}`** – Sözleşme: `title`, `supplierId`, `startsAt`, `endsAt`, `amount`, `period` (`monthly` \| `yearly`), `documentId?`, `autoRenew` (boolean).

### 4.4 Reklam alanları (yönetici)

**`adSpaces/{spaceId}`** – `name`, `location`, `type` (`board` \| `screen` \| `elevator`), `monthlyPrice`, `isAvailable`.

**`adCampaigns/{campaignId}`** – `spaceId`, `advertiserName`, `startsAt`, `endsAt`, `amount`, `status`.

### 4.5 Otopark ve giriş/çıkış

**`parkingSpots/{spotId}`** – Otopark yeri (herkes okur)
`number`, `level`, `type` (`resident` \| `visitor` \| `disabled`), `unitId?`, `status` (`free` \| `assigned` \| `occupied`).

**`parkingLog/{logId}`** – Otopark hareketi (personel yazar)
`spotId`, `plate`, `unitId?`, `type` (`in` \| `out`), `createdAt`, `createdBy`.

**`accessLog/{logId}`** – Giriş/çıkış kaydı (personel yazar; sakin kendi dairesini okur)
`type` (`visitor_in` \| `visitor_out` \| `delivery` \| `service` \| `resident`),
`unitId?`, `personName`, `plate?`, `visitorId?`, `note?`, `createdAt`, `createdBy` (güvenlik uid).

**`visitors/{visitorId}`** – Ziyaretçi ön kaydı (sakin açar, güvenlik işler)
`unitId`, `name`, `phone?`, `plate?`, `expectedAt`, `arrivedAt?`, `leftAt?`,
`status` (`expected` \| `arrived` \| `left` \| `cancelled`), `createdBy`.

**`deliveries/{deliveryId}`** – Kargo/teslimat (personel yazar)
`unitId`, `courier`, `trackingNo?`, `receivedAt`, `deliveredAt?`,
`status` (`at_desk` \| `delivered` \| `returned`), `photoUrl?`, `createdBy`.

### 4.6 Ortak alanlar

**`commonAreas/{areaId}`** – `name`, `capacity`, `slotMinutes`, `openHours?`, `requiresApproval` (boolean), `isActive`, `rules?` (string).

**`reservations/{reservationId}`** – Rezervasyon (sakin kendi dairesi adına)
`areaId`, `unitId`, `startsAt`, `endsAt` (> startsAt), `status` (`pending` \| `approved` \| `rejected` \| `cancelled`),
`note?`, `createdBy`, `decidedBy?`.

### 4.7 İletişim

**`announcements/{announcementId}`** – Duyuru (yönetici yazar; `isPublished` olanları üyeler okur)
`title` (string, zorunlu), `summary`, `body`, `category` (`general` \| `maintenance` \| `meeting` \| `urgent`),
`isPublished` (boolean), `publishedAt`, `isPinned`, `attachments[]?` (Storage yolları),
`pushSentAt?`, `pushTopic?` (`site_{siteId}`), `pushMessageId?`.

**`notifications/{notificationId}`** – Kullanıcıya özel bildirim
`uid` (alıcı), `title`, `body`, `type`, `refPath?` (ilgili belge yolu), `isRead` (boolean), `readAt?`.

**`messages/{messageId}`** – Mesaj (yalnızca katılımcılar)
`participants` (uid[]), `senderId`, `text`, `threadId?`, `readBy` (uid[]).

### 4.8 Talep ve bakım

**`tickets/{ticketId}`** – Arıza / talep
`title` (zorunlu), `description`, `category` (`elevator` \| `electric` \| `plumbing` \| `cleaning` \| `security` \| `other`),
`unitId`, `status` (`open` \| `in_progress` \| `resolved` \| `closed`), `priority` (`low` \| `normal` \| `high`),
`assignedTo?` (staff id), `attachments[]?` (Storage `sites/{siteId}/tickets/{ticketId}/…`), `closedAt?`, `createdBy`.
Sakin yalnızca `status`, `assignedTo`, `priority`, `unitId` dışındaki alanları değiştirebilir.

**`maintenanceTasks/{taskId}`** – Periyodik bakım görevi
`title`, `assetId?`, `assignedTo?`, `scheduledAt`, `recurrence?` (`weekly` \| `monthly` \| `yearly`),
`status` (`todo` \| `doing` \| `done`), `notes?`, `completedAt?`.

**`assets/{assetId}`** – Demirbaş
`name`, `category`, `location`, `serialNo?`, `purchasedAt?`, `warrantyUntil?`, `supplierId?`, `status`.

### 4.9 Personel

**`staff/{staffId}`** – `name`, `role` (`staff` \| `security` \| `cleaning`), `phone`, `uid?`, `isActive`, `startedAt?`.

**`shifts/{shiftId}`** – `staffId`, `startsAt`, `endsAt`, `type` (`day` \| `night`), `note?`.

### 4.10 Belgeler, toplantılar, kararlar, oylamalar

**`documents/{documentId}`** – `title`, `category` (`regulation` \| `minutes` \| `invoice` \| `contract` \| `other`),
`storagePath` (`sites/{siteId}/documents/…`), `size`, `contentType`, `isPublic` (boolean – sakinler görür).

**`meetings/{meetingId}`** – `title`, `scheduledAt`, `location`, `agenda[]`, `status` (`planned` \| `done` \| `cancelled`), `minutesDocumentId?`.

**`decisions/{decisionId}`** – `title`, `meetingId`, `decidedAt`, `votesFor`, `votesAgainst`, `text?`.

**`polls/{pollId}`** – `question`, `options[]`, `status` (`draft` \| `open` \| `closed`), `startsAt`, `endsAt`,
`oneVotePerUnit` (boolean), `results?` (`{optionIndex: count}` – fonksiyon/yönetici günceller).

**`votes/{voteId}`** – Oy; **id = `${pollId}_${uid}`** (kullanıcı başına tek oy, kural zorunlu kılar)
`pollId`, `optionIndex` (number), `unitId`, `createdBy`.

### 4.11 Topluluk

**`marketplace/{listingId}`** – İlan panosu
`title` (zorunlu), `description`, `price?`, `category`, `images[]?`, `status` (`draft` \| `active` \| `sold` \| `removed`), `createdBy`, `unitId?`.

**`lostFound/{itemId}`** – Kayıp-buluntu
`title` (zorunlu), `description`, `type` (`lost` \| `found`), `location`, `imageUrl?`, `status` (`open` \| `resolved`), `createdBy`.

### 4.12 Hukuk (yönetici)

**`legalCases/{caseId}`** – `title`, `unitId?`, `type` (`enforcement` \| `lawsuit` \| `warning`), `amount?`,
`lawyerName?`, `fileNo?`, `status`, `openedAt`, `closedAt?`, `documentIds[]`.

### 4.13 Ayarlar

**`settings/{settingId}`** – Sabit belge kimlikleri (üyeler okur, yönetici yazar):
- `settings/general`: `currency`, `timeZone`, `managerName`, `managerPhone`, `bankIban`.
- `settings/dues`: `monthlyAmount` (number), `dueDay` (1-28), `lateFeeRate?`, `enabled` (boolean).
  `generateMonthlyDues` fonksiyonu bu belgeyi okur.

> Gizli anahtarlar (ödeme sağlayıcı, SMS API vb.) buraya **konmaz**; Cloud Functions
> ortam değişkenleri / Secret Manager kullanılır.

---

## 5. Storage yolları

| Yol | Yazan | Okuyan | Sınır |
|---|---|---|---|
| `sites/{siteId}/documents/**` | admin | aynı site | 20 MB |
| `sites/{siteId}/announcements/**` | admin | aynı site | 20 MB |
| `sites/{siteId}/tickets/{ticketId}/**` | aynı site (oturum açmış) | aynı site | 10 MB, görsel/PDF |
| `users/{uid}/avatar` | sahibi (`customMetadata.siteId` ile) | aynı site | 5 MB, görsel |

---

## 6. Bileşik indeksler (`firestore.indexes.json`)

| Koleksiyon | Alanlar | Tipik sorgu |
|---|---|---|
| `dues` | `unitId ↑, period ↓` | Dairenin aidat geçmişi |
| `dues` | `status ↑, dueDate ↑` | Açık/geciken aidatlar |
| `payments` | `unitId ↑, paidAt ↓` | Dairenin tahsilatları |
| `tickets` | `status ↑, createdAt ↓` | Açık talepler |
| `tickets` | `unitId ↑, createdAt ↓` | Dairenin talepleri |
| `announcements` | `isPublished ↑, publishedAt ↓` | Yayınlanan duyurular |
| `accessLog` | `type ↑, createdAt ↓` | Türüne göre giriş/çıkış akışı |
| `reservations` | `areaId ↑, startsAt ↑` | Alan takvimi |
| `visitors` | `unitId ↑, expectedAt ↓` | Dairenin ziyaretçileri |
| `parkingLog` | `spotId ↑, createdAt ↓` | Yer bazlı hareketler |
| `marketplace` | `status ↑, createdAt ↓` | Aktif ilanlar |

Yeni bir sorgu "requires an index" hatası verirse, hata mesajındaki bağlantı
indeksi otomatik oluşturur; kalıcı olması için `firestore.indexes.json`'a da
ekleyip `firebase deploy --only firestore:indexes` çalıştırın.

---

## 7. Cloud Functions (isteğe bağlı, Blaze)

| Fonksiyon | Tür | Görev |
|---|---|---|
| `setUserRole` | onCall | `{uid, role, siteId, unitId?}` → claim + `users/{uid}` |
| `generateMonthlyDues` | onSchedule `0 3 1 * *` (Europe/Istanbul) | Her daire için `dues/{unitId}_{YYYY-MM}` |
| `onPaymentCreated` | Firestore onCreate `payments` | `duesId` aidatını `partial`/`paid` yapar |
| `onAnnouncementPublished` | Firestore onWrite `announcements` | `isPublished` → `site_{siteId}` FCM konusu |

Bölge: `europe-west1`. Çalışma zamanı: Node.js 22.
