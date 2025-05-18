import { useState, useCallback } from 'react';
import { notificationsApi, Notification } from '../api/notifications';

export const useNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Get all notifications
  const getNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationsApi.getNotifications();
      setNotifications(response.notifications);
      return response.notifications;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الإشعارات');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    notifications,
    getNotifications,
  };
}; 