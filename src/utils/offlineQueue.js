import { supabase } from '../lib/supabase';

const DB_NAME = 'kutsaga-offline';
const DB_VERSION = 1;
const STORE = 'pending_records';
const PHOTO_BUCKET = 'activity-photos';

const queueEvents = new EventTarget();
export const QUEUE_CHANGED_EVENT = 'queue-changed';

function notifyQueueChanged() {
  queueEvents.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export function onQueueChanged(handler) {
  queueEvents.addEventListener(QUEUE_CHANGED_EVENT, handler);
  return () => queueEvents.removeEventListener(QUEUE_CHANGED_EVENT, handler);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function genId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Queue a record for later sync. `photos` is an array of File/Blob objects
// (stored as-is in IndexedDB — no base64 conversion needed).
export async function enqueue(table, payload, photos = []) {
  const record = {
    localId: genId(),
    table,
    payload,
    photos,
    createdAt: Date.now(),
    retries: 0,
  };
  await withStore('readwrite', store => store.add(record));
  notifyQueueChanged();
  return record;
}

export async function getPending(table) {
  const all = await withStore('readonly', store => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
  return table ? all.filter(r => r.table === table) : all;
}

export async function getPendingCount(table) {
  const pending = await getPending(table);
  return pending.length;
}

async function removeRecord(localId) {
  await withStore('readwrite', store => store.delete(localId));
  notifyQueueChanged();
}

async function bumpRetry(localId, record) {
  await withStore('readwrite', store => store.put({ ...record, retries: record.retries + 1 }));
  notifyQueueChanged();
}

async function uploadPhotos(photos, userId) {
  const urls = [];
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw error;
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// Attempts to push every queued record to Supabase. Leaves failed records
// queued (with retries bumped) so a flaky connection never drops data.
export async function syncPending(userId) {
  if (!userId || !navigator.onLine) return;
  const pending = await getPending();

  for (const record of pending) {
    try {
      let payload = record.payload;
      if (record.photos?.length) {
        const photo_urls = await uploadPhotos(record.photos, userId);
        payload = { ...payload, photo_urls: [...(payload.photo_urls || []), ...photo_urls] };
      }

      if (record.table === 'activities') {
        const { _expenses, ...activityFields } = payload;
        const { data, error } = await supabase.from('activities').insert(activityFields).select().single();
        if (error) throw error;
        await removeRecord(record.localId);

        // Best-effort: an activity is the record of value here, so once it's
        // saved we don't want a flaky expense insert to re-queue (and thus
        // duplicate) the whole activity on retry.
        if (_expenses?.length) {
          const rows = _expenses.map(exp => ({ ...exp, activity_id: data.id }));
          const { error: expErr } = await supabase.from('expenses').insert(rows);
          if (expErr) console.warn('[offlineQueue] activity synced but its expenses failed:', expErr.message);
        }
      } else {
        const { error } = await supabase.from(record.table).insert(payload);
        if (error) throw error;
        await removeRecord(record.localId);
      }
    } catch (e) {
      console.warn(`[offlineQueue] sync failed for ${record.table}/${record.localId}:`, e.message);
      await bumpRetry(record.localId, record);
    }
  }
}
