import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Types
export interface Notification {
  id: string;
  transaction_id: string;
  recipient_phone: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  created_at: string;
}

// API Functions
export const notificationsApi = {
  // Get all notifications
  getNotifications: async (): Promise<{ notifications: Notification[] }> => {
    const response = await axios.get(`${API_URL}/notifications/`);
    return response.data;
  }
}; 