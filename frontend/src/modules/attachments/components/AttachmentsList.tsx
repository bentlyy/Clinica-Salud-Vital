import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AttachFile from '@mui/icons-material/AttachFile';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Download from '@mui/icons-material/Download';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '../hooks/useAttachments';

interface AttachmentsListProps {
  entityType: string;
  entityId: number | null;
  canManage?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsList({ entityType, entityId, canManage = true }: AttachmentsListProps) {
  const { t } = useTranslation('attachments');
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const uploadMutation = useUploadAttachment(entityType, entityId ?? 0);
  const deleteMutation = useDeleteAttachment(entityType, entityId ?? 0);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (!entityId) return null;

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {t('title', { defaultValue: 'Archivos adjuntos' })}
        </Typography>
        {canManage && (
          <Button
            variant="outlined"
            size="small"
            startIcon={isUploading ? <CircularProgress size={16} /> : <AttachFile />}
            disabled={isUploading || uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            {t('upload', { defaultValue: 'Adjuntar' })}
          </Button>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelected}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.dcm"
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List sx={{ pt: 0 }}>
          {(attachments ?? []).map((attachment) => (
            <ListItem key={attachment.id} divider sx={{ px: 0 }}>
              <ListItemText
                primary={attachment.original_name}
                secondary={formatBytes(attachment.size_bytes)}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={t('download', { defaultValue: 'Descargar' })}
                  title={t('download', { defaultValue: 'Descargar' })}
                  onClick={() => attachmentsServiceDownload(attachment.id, attachment.original_name)}
                >
                  <Download fontSize="small" />
                </IconButton>
                {canManage && (
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteTarget({ id: attachment.id, name: attachment.original_name })}
                    aria-label={t('delete', { defaultValue: 'Eliminar' })}
                    title={t('delete', { defaultValue: 'Eliminar' })}
                    sx={{ ml: 0.5 }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {(attachments ?? []).length === 0 && (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, py: 1 }}>
              {t('empty', { defaultValue: 'Sin archivos adjuntos' })}
            </Typography>
          )}
        </List>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('deleteTitle', { defaultValue: 'Eliminar archivo' })}
        message={t('deleteMessage', { defaultValue: '¿Deseas eliminar este archivo adjunto?' })}
        confirmLabel={t('delete', { defaultValue: 'Eliminar' })}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

function attachmentsServiceDownload(id: number, fileName: string) {
  import('../services/attachments.service').then(({ attachmentsService }) => {
    void attachmentsService.download(id, fileName);
  });
}
