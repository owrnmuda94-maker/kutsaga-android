import { useCallback, useEffect, useState } from 'react';
import { getPending, getPendingCount, onQueueChanged, syncPending } from '../utils/offlineQueue';

// Shared offline-outbox glue for any page that needs to save even without
// signal (Activities, Expenses) and sync automatically once back online.
export function useOfflineSync(userId, table) {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRecords, setPendingRecords] = useState([]);

  const refresh = useCallback(async () => {
    const [count, records] = await Promise.all([getPendingCount(table), getPending(table)]);
    setPendingCount(count);
    setPendingRecords(records);
  }, [table]);

  const syncNow = useCallback(async () => {
    await syncPending(userId);
    await refresh();
  }, [userId, refresh]);

  useEffect(() => {
    refresh();
    const unsubscribe = onQueueChanged(refresh);
    window.addEventListener('online', syncNow);

    if (userId && navigator.onLine) syncNow();

    return () => {
      unsubscribe();
      window.removeEventListener('online', syncNow);
    };
  }, [userId, refresh, syncNow]);

  return { pendingCount, pendingRecords, syncNow };
}
