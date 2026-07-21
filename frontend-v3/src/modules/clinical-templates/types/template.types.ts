export type TemplateFieldType = 'text' | 'textarea' | 'number' | 'select';

export interface TemplateField {
  name: string;
  type: TemplateFieldType;
  options?: string[];
  required: boolean;
}

export interface ClinicalTemplate {
  id: number;
  tenant_id: number;
  name: string;
  specialty?: string;
  fields: TemplateField[];
  created_at: string;
}

export interface CreateTemplateInput {
  name: string;
  specialty?: string;
  fields: TemplateField[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}
