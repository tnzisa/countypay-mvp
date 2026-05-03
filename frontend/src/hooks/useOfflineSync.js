/**
 * useOfflineSync Hook - Manages offline state and transaction syncing
 */

import { useState, useEffect, useCallback } from 'react';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OFFLINE_SYNC] Connection restored');
      setIsOnline(true);
      // Trigger sync when coming back online
      syncPendingTransactions();
    };

    const handleOffline = () => {
      console.log('[OFFLINE_SYNC] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending transactions
  const syncPendingTransactions = useCallback(async () => {
    if (isSyncing || !window.offlineQueueService) {
      return;
    }

    setIsSyncing(true);
    try {
      console.log('[OFFLINE_SYNC] Starting sync...');
      
      const pending = await window.offlineQueueService.getPendingTransactions();
      setPendingTransactions(pending);

      for (const transaction of pending) {
        try {
          // Try to submit transaction
          const response = await fetch('/api/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              feeId: transaction.feeId,
              phoneNumber: transaction.phoneNumber,
              paymentMethod: transaction.paymentMethod,
              idempotencyKey: transaction.idempotencyKey || `offline-${transaction.id}`
            })
          });

          if (response.ok) {
            const result = await response.json();
            await window.offlineQueueService.markSynced(transaction.id, result.transaction.id);
            console.log(`[OFFLINE_SYNC] Synced transaction: ${transaction.id}`);
          } else {
            await window.offlineQueueService.incrementSyncAttempts(transaction.id);
          }
        } catch (error) {
          console.error(`[OFFLINE_SYNC] Sync failed for ${transaction.id}:`, error);
          await window.offlineQueueService.incrementSyncAttempts(transaction.id);
        }
      }

      // Clean up synced transactions
      await window.offlineQueueService.clearSynced();
      
      setLastSyncTime(new Date().toISOString());
      setPendingTransactions(await window.offlineQueueService.getPendingTransactions());
      
      console.log('[OFFLINE_SYNC] Sync complete');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Trigger background sync if available
  const triggerBackgroundSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-payments');
        console.log('[OFFLINE_SYNC] Background sync registered');
      } catch (error) {
        console.error('[OFFLINE_SYNC] Background sync registration failed:', error);
      }
    }
  }, []);

  // Queue transaction for offline
  const queueTransaction = useCallback(async (transaction) => {
    if (!window.offlineQueueService) {
      throw new Error('Offline service not initialized');
    }
    
    const id = await window.offlineQueueService.addTransaction(transaction);
    setPendingTransactions(await window.offlineQueueService.getPendingTransactions());
    
    // Try to sync if online
    if (isOnline) {
      await syncPendingTransactions();
    } else {
      // Register background sync
      await triggerBackgroundSync();
    }
    
    return id;
  }, [isOnline, syncPendingTransactions, triggerBackgroundSync]);

  return {
    isOnline,
    pendingTransactions,
    isSyncing,
    lastSyncTime,
    syncNow: syncPendingTransactions,
    queueTransaction,
    triggerBackgroundSync
  };
}

export default useOfflineSync;
