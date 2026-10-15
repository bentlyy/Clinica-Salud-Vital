import { z } from 'zod';

export const createLabRequestSchema = z.object({
  patient_id: z.coerce.number().int().positive('patient_id is required'),
  clinical_record_id: z.coerce.number().int().positive().optional(),
  priority: z.enum(['routine', 'urgent', 'emergency']).optional().default('routine'),
  notes: z.string().optional(),
  test_ids: z.array(z.coerce.number().int().positive()).min(1, 'At least one test is required'),
}).strict();

export const labRequestIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const labItemIdParamSchema = z.object({
  item_id: z.coerce.number().int().positive(),
}).strict();

export const LAB_REQUEST_STATUSES = [
  'pending',
  'received',
  'verified',
  'assigned',
  'processing',
  'qc_review',
  'result_entered',
  'validated_tech',
  'validated_doctor',
  'signed',
  'delivered',
  'cancelled',
  'rejected',
  'repeated',
] as const;

export const labRequestStatusSchema = z.object({
  status: z.enum(LAB_REQUEST_STATUSES),
});

export const labItemStatusSchema = z.object({
  status: z.enum(LAB_REQUEST_STATUSES),
});

export const labTypeSchema = z.object({
  lab_type: z.enum(['internal', 'external']),
});

export const labItemResultSchema = z.object({
  result_value: z.union([z.string().max(4000), z.number()]).transform((v) => String(v)),
  result_notes: z.string().trim().max(4000).optional(),
});

export const labDeliverSchema = z.object({
  method: z.string().trim().min(1).max(50).optional(),
});

export const labRejectSampleSchema = z.object({
  rejection_reason: z.string().trim().min(1).max(1000),
});

export const labReagentStockSchema = z.object({
  quantity: z.number().finite(),
});

export const labTestCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().max(4000).nullish(),
    code: z.string().trim().max(50).nullish(),
    category: z.string().trim().max(100).nullish(),
    unit: z.string().trim().max(50).nullish(),
    reference_min: z.coerce.number().nullish(),
    reference_max: z.coerce.number().nullish(),
    price: z.coerce.number().min(0).nullish(),
    reference_ranges: z.record(z.string(), z.unknown()).nullish(),
    lab_area_id: z.coerce.number().int().positive().nullish(),
    active: z.boolean().optional(),
  });

export const labTestUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().max(4000).nullish(),
    code: z.string().trim().max(50).nullish(),
    category: z.string().trim().max(100).nullish(),
    unit: z.string().trim().max(50).nullish(),
    reference_min: z.coerce.number().nullish(),
    reference_max: z.coerce.number().nullish(),
    price: z.coerce.number().min(0).nullish(),
    reference_ranges: z.record(z.string(), z.unknown()).nullish(),
    active: z.boolean().optional(),
  });

export const labAreaCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    code: z.string().trim().min(1).max(20),
    description: z.string().max(4000).nullish(),
    icon: z.string().trim().max(50).nullish(),
    color: z.string().trim().max(7).nullish(),
    sort_order: z.coerce.number().int().nullish(),
    active: z.boolean().optional(),
  });

export const labEquipmentConnectionTypes = ['manual', 'hl7', 'astm', 'serial', 'file'] as const;
export const labEquipmentStatuses = ['online', 'offline', 'maintenance', 'calibration'] as const;

export const labEquipmentCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    model: z.string().trim().max(255).nullish(),
    serial_number: z.string().trim().max(255).nullish(),
    lab_area_id: z.coerce.number().int().positive().nullish(),
    connection_type: z.enum(labEquipmentConnectionTypes).optional(),
    ip_address: z.string().trim().max(45).nullish(),
    port: z.coerce.number().int().min(0).max(65535).nullish(),
    status: z.enum(labEquipmentStatuses).optional(),
    notes: z.string().max(4000).nullish(),
    active: z.boolean().optional(),
  });

export const labEquipmentUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    model: z.string().trim().max(255).nullish(),
    serial_number: z.string().trim().max(255).nullish(),
    lab_area_id: z.coerce.number().int().positive().nullish(),
    connection_type: z.enum(labEquipmentConnectionTypes).nullish(),
    ip_address: z.string().trim().max(45).nullish(),
    port: z.coerce.number().int().min(0).max(65535).nullish(),
    status: z.enum(labEquipmentStatuses).nullish(),
    notes: z.string().max(4000).nullish(),
    active: z.boolean().optional(),
  });

export const labReagentCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    catalog_number: z.string().trim().max(100).nullish(),
    lot_number: z.string().trim().max(100).nullish(),
    supplier: z.string().trim().max(255).nullish(),
    stock_quantity: z.coerce.number().int().nullish(),
    unit: z.string().trim().max(50).nullish(),
    min_stock: z.coerce.number().int().nullish(),
    current_stock: z.coerce.number().int().nullish(),
    expiration_date: z.string().trim().max(40).nullish(),
    storage_conditions: z.string().max(4000).nullish(),
    lab_test_id: z.coerce.number().int().positive().nullish(),
    lab_area_id: z.coerce.number().int().positive().nullish(),
    active: z.boolean().optional(),
  });

export const labSampleCreateSchema = z
  .object({
    sample_type: z.string().trim().min(1).max(100),
    lab_request_item_id: z.coerce.number().int().positive().nullish(),
    lab_request_id: z.coerce.number().int().positive().nullish(),
    container_type: z.string().trim().max(100).nullish(),
    volume: z.coerce.number().nullish(),
    storage_location: z.string().trim().max(100).nullish(),
    notes: z.string().max(4000).nullish(),
  });

export const labQcStatusSchema = z.enum(['passed', 'failed', 'warning', 'review']);

export const labQcCreateSchema = z
  .object({
    qc_type: z.string().trim().min(1).max(50),
    control_name: z.string().trim().min(1).max(255),
    status: labQcStatusSchema,
    lab_test_id: z.coerce.number().int().positive().nullish(),
    lab_area_id: z.coerce.number().int().positive().nullish(),
    sample_id: z.coerce.number().int().positive().nullish(),
    equipment_id: z.coerce.number().int().positive().nullish(),
    reagent_id: z.coerce.number().int().positive().nullish(),
    lot_number: z.string().trim().max(100).nullish(),
    expiration_date: z.string().trim().max(40).nullish(),
    measured_value: z.coerce.number().nullish(),
    expected_min: z.coerce.number().nullish(),
    expected_max: z.coerce.number().nullish(),
    notes: z.string().max(4000).nullish(),
  });

export const labSampleReceiveSchema = z.object({
  reception_time: z.string().trim().max(40).optional(),
});

export const labSampleAssignSchema = z.object({
  assigned_tech_id: z.coerce.number().int().positive(),
  assigned_equipment_id: z.coerce.number().int().positive().nullish(),
});

export const labSampleQcSchema = z.object({
  qc_status: z.string().trim().min(1).max(50),
  qc_notes: z.string().max(4000).nullish(),
});

export const labResultsEmailSchema = z.object({
  lab_request_id: z.coerce.number().int().positive().optional(),
});

