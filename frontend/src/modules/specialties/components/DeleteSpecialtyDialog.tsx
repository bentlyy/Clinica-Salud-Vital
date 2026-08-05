import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import type { Specialty } from '../types/specialty.types';

interface DeleteSpecialtyDialogProps {
  specialty: Specialty | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSpecialtyDialog({ specialty, isPending, onClose, onConfirm }: DeleteSpecialtyDialogProps) {
  const { t } = useTranslation('specialties');
  const { t: tc } = useTranslation('common');

  const rawMessage = t('confirmDeleteMessage', { name: specialty?.name ?? '' });
  const parts = rawMessage.split(/(<strong>.*?<\/strong>)/g);
  const message = (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
          return <strong key={i}>{part.replace(/<\/?strong>/g, '')}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
      <br />
      {tc('thisActionCannotBeUndone')}
    </>
  );

  return (
    <ConfirmDialog
      open={!!specialty}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('deleteTitle')}
      message={message}
      variant="danger"
      confirmLabel={tc('delete')}
      cancelLabel={tc('cancel')}
      loading={isPending}
    />
  );
}
