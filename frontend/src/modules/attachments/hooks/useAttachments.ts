import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsService } from '../services/attachments.service';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

const attachmentsKeys = {
  list: (entityType: string, entityId: number) => ['attachments', entityType, entityId] as const,
};

export function useAttachments(entityType: string, entityId: number | null) {
  return useQuery({
    queryKey: attachmentsKeys.list(entityType, entityId ?? 0),
    queryFn: () => attachmentsService.list(entityType, entityId!),
    enabled: !!entityId,
  });
}

export function useUploadAttachment(entityType: string, entityId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attachmentsService.upload(entityType, entityId, file),
    onSuccess: () => {
      toast.success(i18n.t('attachments:uploaded', { defaultValue: 'Archivo adjuntado' }));
      void queryClient.invalidateQueries({ queryKey: attachmentsKeys.list(entityType, entityId) });
    },
    onError: () => {
      toast.error(i18n.t('attachments:uploadError', { defaultValue: 'Error al adjuntar archivo' }));
    },
  });
}

export function useDeleteAttachment(entityType: string, entityId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attachmentsService.remove(id),
    onSuccess: () => {
      toast.success(i18n.t('attachments:deleted', { defaultValue: 'Archivo eliminado' }));
      void queryClient.invalidateQueries({ queryKey: attachmentsKeys.list(entityType, entityId) });
    },
  });
}
