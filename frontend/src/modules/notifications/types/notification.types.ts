export interface Notification {
  id: number;
  tenant_id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  is_read?: boolean;
}

export const NOTIFICATION_TYPE_CONFIG: Record<
  Notification['type'],
  { label: string; color: string; bgColor: string }
> = {
  info: { label: 'Info', color: '#2563eb', bgColor: '#eff6ff' },
  warning: { label: 'Advertencia', color: '#d97706', bgColor: '#fffbeb' },
  success: { label: 'Éxito', color: '#059669', bgColor: '#ecfdf5' },
  error: { label: 'Error', color: '#ef4444', bgColor: '#fef2f2' },
};
