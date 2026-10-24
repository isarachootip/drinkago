export interface QueuedMutation {
  idempotencyKey: string;
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
  createdAt: number;
}

const DB_NAME = 'drinkgo_rider_offline';
const STORE_NAME = 'mutation_queue';
const memoryFallback = new Map<string, QueuedMutation>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineMutation(item: QueuedMutation): Promise<void> {
  if (!hasIndexedDb()) {
    memoryFallback.set(item.idempotencyKey, item);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function listOfflineMutations(): Promise<QueuedMutation[]> {
  if (!hasIndexedDb()) {
    return [...memoryFallback.values()].sort((a, b) => a.createdAt - b.createdAt);
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      db.close();
      const items = (req.result as QueuedMutation[]).sort((a, b) => a.createdAt - b.createdAt);
      resolve(items);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function removeOfflineMutation(idempotencyKey: string): Promise<void> {
  if (!hasIndexedDb()) {
    memoryFallback.delete(idempotencyKey);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(idempotencyKey);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
