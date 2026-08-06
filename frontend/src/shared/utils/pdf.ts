import { apiClient } from '@/shared/services/api-client';
import { logger } from '@/shared/utils/logger';
import toast from 'react-hot-toast';
import i18n from '@/i18n/i18n';

export async function downloadPdf(url: string, filename: string): Promise<void> {
  try {
    const response = await apiClient.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    logger.error('PDF download failed:', error);
    toast.error(i18n.t('errors:pdfDownloadError'));
    throw error;
  }
}

export function downloadLabOrderPdf(id: number): Promise<void> {
  return downloadPdf(`/laboratory/${id}/pdf`, `orden-${id}.pdf`);
}

export function downloadClinicalRecordPdf(id: number): Promise<void> {
  return downloadPdf(`/clinical-records/${id}/pdf`, `historial-${id}.pdf`);
}

export function downloadPrescriptionPdf(id: number): Promise<void> {
  return downloadPdf(`/prescriptions/${id}/pdf`, `receta-${id}.pdf`);
}
