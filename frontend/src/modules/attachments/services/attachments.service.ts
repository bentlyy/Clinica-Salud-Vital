import { apiClient } from '@/shared/services/api-client';
import type { Attachment } from '../types/attachments.types';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const attachmentsService = {
  async upload(entityType: string, entityId: number, file: File): Promise<Attachment> {
    const data_base64 = await readFileAsBase64(file);
    const { data } = await apiClient.post<Attachment>('/attachments', {
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      data_base64,
    });
    return data;
  },

  async list(entityType: string, entityId: number): Promise<Attachment[]> {
    const { data } = await apiClient.get<{ data: Attachment[] }>('/attachments', {
      params: { entity_type: entityType, entity_id: entityId },
    });
    return data.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/attachments/${id}`);
  },

  async download(id: number, fileName: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/attachments/${id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
