import { useState, useEffect, useCallback } from 'react';
import type { LabNotification } from '../types';
import { getNotifications, acknowledgeNotification } from '../api/laboratory.api';

export function useLabNotifications() {
  const [notifications, setNotifications] = useState<LabNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 50 });
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.acknowledged).length);
    } catch {
      // silent fail for notifications
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const acknowledge = useCallback(async (id: number) => {
    await acknowledgeNotification(id);
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, acknowledged: true, acknowledged_at: new Date().toISOString() } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const acknowledgeAll = useCallback(async () => {
    const unread = notifications.filter(n => !n.acknowledged);
    await Promise.all(unread.map(n => acknowledgeNotification(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, acknowledged: true })));
    setUnreadCount(0);
  }, [notifications]);

  return {
    notifications, loading, unreadCount,
    refresh: fetch, acknowledge, acknowledgeAll,
  };
}
