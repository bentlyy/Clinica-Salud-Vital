export interface Attachment {
  id: number;
  tenant_id: string;
  entity_type: string;
  entity_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number;
  created_at: string;
}
