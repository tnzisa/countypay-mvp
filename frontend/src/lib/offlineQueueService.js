/**
 * Offline Queue Service - Manages pending transactions when offline
 */

class OfflineQueueService {
  constructor(dbName = 'countypay-offline') {
    this.dbName = dbName;
    this.storeName = 'pendingTransactions';
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OFFLINE_QUEUE] IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[OFFLINE_QUEUE] Object store created');
        }
      };
    });
  }

  /**
   * Add transaction to offline queue
   */
  async addTransaction(transaction) {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readwrite')
        .objectStore(this.storeName);
      
      const data = {
        ...transaction,
        status: 'PENDING_SYNC',
        queuedAt: new Date().toISOString(),
        syncAttempts: 0
      };

      const request = store.add(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[OFFLINE_QUEUE] Transaction queued: ${request.result}`);
        resolve(request.result);
      };
    });
  }

  /**
   * Get all pending transactions
   */
  async getPendingTransactions() {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readonly')
        .objectStore(this.storeName);
      
      const index = store.index('status');
      const request = index.getAll('PENDING_SYNC');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[OFFLINE_QUEUE] Retrieved ${request.result.length} pending transactions`);
        resolve(request.result);
      };
    });
  }

  /**
   * Mark transaction as synced
   */
  async markSynced(id, transactionId) {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readwrite')
        .objectStore(this.storeName);
      
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        data.status = 'SYNCED';
        data.syncedAt = new Date().toISOString();
        data.transactionId = transactionId;

        const updateRequest = store.put(data);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => {
          console.log(`[OFFLINE_QUEUE] Transaction marked synced: ${id}`);
          resolve(data);
        };
      };
    });
  }

  /**
   * Increment sync attempts
   */
  async incrementSyncAttempts(id) {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readwrite')
        .objectStore(this.storeName);
      
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        data.syncAttempts = (data.syncAttempts || 0) + 1;
        data.lastSyncAttempt = new Date().toISOString();

        const updateRequest = store.put(data);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve(data);
      };
    });
  }

  /**
   * Mark transaction as failed
   */
  async markFailed(id, error) {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readwrite')
        .objectStore(this.storeName);
      
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        data.status = 'FAILED';
        data.failedAt = new Date().toISOString();
        data.lastError = error;

        const updateRequest = store.put(data);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve(data);
      };
    });
  }

  /**
   * Clear synced transactions (cleanup)
   */
  async clearSynced() {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction([this.storeName], 'readwrite')
        .objectStore(this.storeName);
      
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('SYNCED'));
      
      let deletedCount = 0;
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`[OFFLINE_QUEUE] Cleared ${deletedCount} synced transactions`);
          resolve(deletedCount);
        }
      };
    });
  }
}

// Export singleton
if (typeof window !== 'undefined') {
  window.offlineQueueService = new OfflineQueueService();
}

export default OfflineQueueService;
