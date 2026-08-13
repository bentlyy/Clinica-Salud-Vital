import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';

export interface NotificationListParams {
  page?: number;
  limit?: number;
  tenantId?: string;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationListParams) => ['notifications', 'list', params] as const,
};

export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) => notificationService.list(params, { signal }),
    placeholderData: (prev) => prev,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
