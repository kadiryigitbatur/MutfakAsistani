// Veri katmanı: aynı arayüz ile Demo (localStorage) veya Firestore.
// Tüm site verisi sites/{siteId}/{koleksiyon} altında tutulur (çok kiracılı yapı).
import { firebaseEnabled, initFirebase } from './firebase.js';
import { buildDemoData, DEMO_SITE } from './demo-data.js';

const LS_KEY = 'sy_demo_v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

class DemoStore {
  constructor() {
    this.mode = 'demo';
    this.siteId = DEMO_SITE.id;
    this.listeners = new Set();
    this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      this.data = raw ? JSON.parse(raw) : buildDemoData();
    } catch { this.data = buildDemoData(); }
  }
  save() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch {} this.listeners.forEach((f) => f()); }
  reset() { this.data = buildDemoData(); this.save(); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  async list(col, filter) {
    let rows = (this.data[col] || []).slice();
    if (filter) rows = rows.filter(filter);
    return rows;
  }
  async get(col, id) { return (this.data[col] || []).find((r) => r.id === id) || null; }
  async add(col, doc) {
    const row = { id: uid(), createdAt: new Date().toISOString(), ...doc };
    (this.data[col] ||= []).unshift(row); this.save(); return row;
  }
  async update(col, id, patch) {
    const rows = this.data[col] || []; const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) { rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() }; this.save(); return rows[i]; }
    return null;
  }
  async remove(col, id) { this.data[col] = (this.data[col] || []).filter((r) => r.id !== id); this.save(); }
  async site() { return this.data.site; }
}

class FirestoreStore {
  constructor(ctx, siteId) {
    this.mode = 'firebase'; this.ctx = ctx; this.siteId = siteId; this.fs = ctx.mod.fs; this.listeners = new Set();
  }
  col(name) { return this.fs.collection(this.ctx.db, 'sites', this.siteId, name); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((f) => f()); }
  norm(d) { const o = { id: d.id, ...d.data() }; for (const k in o) if (o[k]?.toDate) o[k] = o[k].toDate().toISOString(); return o; }
  async list(name, filter) {
    const { getDocs, query, orderBy, limit } = this.fs;
    let snap;
    try { snap = await getDocs(query(this.col(name), orderBy('createdAt', 'desc'), limit(500))); }
    catch { snap = await getDocs(query(this.col(name), limit(500))); }
    let rows = snap.docs.map((d) => this.norm(d));
    if (filter) rows = rows.filter(filter);
    return rows;
  }
  async get(name, id) { const s = await this.fs.getDoc(this.fs.doc(this.col(name), id)); return s.exists() ? this.norm(s) : null; }
  async add(name, doc) {
    const ref = await this.fs.addDoc(this.col(name), { ...doc, createdAt: this.fs.serverTimestamp() });
    this.notify(); return { id: ref.id, ...doc };
  }
  async update(name, id, patch) {
    await this.fs.updateDoc(this.fs.doc(this.col(name), id), { ...patch, updatedAt: this.fs.serverTimestamp() });
    this.notify(); return { id, ...patch };
  }
  async remove(name, id) { await this.fs.deleteDoc(this.fs.doc(this.col(name), id)); this.notify(); }
  async site() {
    const s = await this.fs.getDoc(this.fs.doc(this.ctx.db, 'sites', this.siteId));
    return s.exists() ? { id: s.id, ...s.data() } : { id: this.siteId, name: 'Site' };
  }
  reset() {}
}

export async function createStore(siteId) {
  if (!firebaseEnabled) return new DemoStore();
  const ctx = await initFirebase();
  return new FirestoreStore(ctx, siteId);
}

// ---- Oturum / kullanıcı ----
export const DEMO_USERS = {
  admin: { uid: 'demo-admin', name: 'Ayşe Demir', role: 'admin', roleLabel: 'Site Yöneticisi', siteId: DEMO_SITE.id, unitId: null, email: 'yonetim@yesilvadi.demo' },
  resident: { uid: 'demo-resident', name: 'Mehmet Kaya', role: 'resident', roleLabel: 'Sakin', siteId: DEMO_SITE.id, unitId: 'A-12', email: 'mehmet@ornek.com' },
  security: { uid: 'demo-security', name: 'Hasan Yılmaz', role: 'security', roleLabel: 'Güvenlik', siteId: DEMO_SITE.id, unitId: null, email: 'guvenlik@yesilvadi.demo' },
};

export async function signInWithEmail(email, password) {
  const ctx = await initFirebase();
  const { signInWithEmailAndPassword } = ctx.mod.auth;
  const cred = await signInWithEmailAndPassword(ctx.auth, email, password);
  return loadProfile(ctx, cred.user);
}
export async function currentFirebaseUser() {
  const ctx = await initFirebase();
  return new Promise((res) => { const un = ctx.mod.auth.onAuthStateChanged(ctx.auth, async (u) => { un(); res(u ? await loadProfile(ctx, u) : null); }); });
}
async function loadProfile(ctx, user) {
  const { getDoc, doc } = ctx.mod.fs;
  const token = await user.getIdTokenResult();
  const snap = await getDoc(doc(ctx.db, 'users', user.uid));
  const p = snap.exists() ? snap.data() : {};
  const role = token.claims.role || p.role || 'resident';
  const labels = { superadmin: 'Sistem Yöneticisi', admin: 'Site Yöneticisi', staff: 'Personel', security: 'Güvenlik', resident: 'Sakin' };
  return { uid: user.uid, email: user.email, name: p.name || user.displayName || user.email, role, roleLabel: labels[role] || role, siteId: token.claims.siteId || p.siteId, unitId: token.claims.unitId || p.unitId || null };
}
export async function signOutFirebase() { const ctx = await initFirebase(); await ctx.mod.auth.signOut(ctx.auth); }
