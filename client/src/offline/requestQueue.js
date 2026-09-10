import { openDB } from 'idb';

const DB_NAME = 'farmgrid_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_requests';

/**
 * Initialize IndexedDB instance
 */
export async function initOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'localId',
          autoIncrement: true
        });
        store.createIndex('createdAt', 'createdAt');
      }
    }
  });
}

/**
 * Save request to IndexedDB when device is offline
 */
export async function saveOfflineRequest(requestPayload) {
  try {
    const db = await initOfflineDB();
    const entry = {
      ...requestPayload,
      savedOfflineAt: new Date().toISOString(),
      syncStatus: 'PENDING_SYNC'
    };
    const id = await db.add(STORE_NAME, entry);
    return { localId: id, ...entry };
  } catch (err) {
    console.error('[OfflineQueue] Failed to save to IndexedDB:', err);
    throw err;
  }
}

/**
 * Get all requests waiting in the offline queue
 */
export async function getQueuedRequests() {
  try {
    const db = await initOfflineDB();
    return await db.getAll(STORE_NAME);
  } catch (err) {
    console.error('[OfflineQueue] Failed to read from IndexedDB:', err);
    return [];
  }
}

/**
 * Count total pending offline requests
 */
export async function getQueuedCount() {
  try {
    const db = await initOfflineDB();
    return await db.count(STORE_NAME);
  } catch (err) {
    console.error('[OfflineQueue] Failed to get count:', err);
    return 0;
  }
}

/**
 * Remove a synchronized request from IndexedDB
 */
export async function removeQueuedRequest(localId) {
  try {
    const db = await initOfflineDB();
    await db.delete(STORE_NAME, localId);
  } catch (err) {
    console.error(`[OfflineQueue] Failed to delete record ${localId}:`, err);
  }
}

/**
 * Synchronize all queued requests to the server
 */
export async function syncQueuedRequests(apiClient, onProgress = null) {
  const queued = await getQueuedRequests();
  if (!queued || queued.length === 0) {
    return { syncedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors = [];

  for (const item of queued) {
    try {
      const { localId, savedOfflineAt, syncStatus, ...payload } = item;
      // Submit via API
      await apiClient.post('/requests', payload);
      await removeQueuedRequest(localId);
      syncedCount++;

      if (onProgress) {
        onProgress({ current: syncedCount, total: queued.length });
      }
    } catch (err) {
      console.error(`[OfflineQueue] Failed syncing item ${item.localId}:`, err);
      errors.push({ item, error: err.message });
    }
  }

  return {
    syncedCount,
    remainingCount: queued.length - syncedCount,
    errors
  };
}
