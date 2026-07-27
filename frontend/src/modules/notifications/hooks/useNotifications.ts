import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: { page?: number; limit?: number }) => ['notifications', 'list', params] as const,
};

export function useNotifications(params?: { page?: number; limit?: number }) {
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
