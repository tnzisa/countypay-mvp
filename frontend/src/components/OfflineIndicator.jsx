/**
 * OfflineIndicator Component - Shows offline status and pending transactions
 */

import React from 'react';
import useOfflineSync from '../hooks/useOfflineSync';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const {
    isOnline,
    pendingTransactions,
    isSyncing,
    lastSyncTime,
    syncNow
  } = useOfflineSync();

  if (isOnline && pendingTransactions.length === 0) {
    return null;
  }

  return (
    <div className={`offline-indicator ${!isOnline ? 'offline' : 'online'}`}>
      <div className="offline-content">
        {!isOnline && (
          <div className="offline-status">
            <span className="offline-icon">📡</span>
            <span className="offline-text">You're offline</span>
          </div>
        )}

        {pendingTransactions.length > 0 && (
          <div className="pending-transactions">
            <span className="pending-icon">⏳</span>
            <span className="pending-text">
              {pendingTransactions.length} transaction{pendingTransactions.length !== 1 ? 's' : ''} waiting to sync
            </span>
            {isOnline && (
              <button
                className="sync-button"
                onClick={syncNow}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}

        {lastSyncTime && (
          <div className="last-sync">
            Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
