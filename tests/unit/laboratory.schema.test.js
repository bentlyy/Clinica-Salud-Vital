import { describe, it, expect } from 'vitest';
import {
  createLabRequestSchema,
  labRequestIdSchema,
  labItemIdParamSchema,
  labRequestStatusSchema,
  labItemStatusSchema,
  labTypeSchema,
  labItemResultSchema,
  labDeliverSchema,
  labRejectSampleSchema,
  labReagentStockSchema,
  labTestCreateSchema,
  labTestUpdateSchema,
  labAreaCreateSchema,
  labEquipmentCreateSchema,
  labEquipmentUpdateSchema,
  labReagentCreateSchema,
  labSampleCreateSchema,
  labQcCreateSchema,
  labSampleReceiveSchema,
  labSampleAssignSchema,
  labSampleQcSchema,
  labResultsEmailSchema,
  LAB_REQUEST_STATUSES,
} from '../../src/modules/laboratory/laboratory.schema.js';

describe('createLabRequestSchema', () => {
  it('accepts valid input', () => {
    const result = createLabRequestSchema.safeParse({
      patient_id: 1, test_ids: [1, 2],
    });
    expect(result.success).toBe(true);
  });

  it('accepts single test_id', () => {
    const result = createLabRequestSchema.safeParse({
      patient_id: 1, test_ids: [5],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing test_ids', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing patient_id', () => {
    const result = createLabRequestSchema.safeParse({ test_ids: [1, 2] });
    expect(result.success).toBe(false);
  });

  it('rejects negative patient_id', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: -1, test_ids: [1] });
    expect(result.success).toBe(false);
  });

  it('rejects zero patient_id', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 0, test_ids: [1] });
    expect(result.success).toBe(false);
  });

  it('rejects non-array test_ids', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: 'not-an-array' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer test_ids items', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: ['abc', 2] });
    expect(result.success).toBe(false);
  });

  it('rejects empty request body', () => {
    const result = createLabRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('labRequestIdSchema', () => {
  it('accepts positive integer', () => {
    const result = labRequestIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts large positive integer', () => {
    const result = labRequestIdSchema.safeParse({ id: 999999 });
    expect(result.success).toBe(true);
  });

  it('rejects negative id', () => {
    const result = labRequestIdSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero id', () => {
    const result = labRequestIdSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects string id', () => {
    const result = labRequestIdSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = labRequestIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null id', () => {
    const result = labRequestIdSchema.safeParse({ id: null });
    expect(result.success).toBe(false);
  });

  it('rejects float id', () => {
    const result = labRequestIdSchema.safeParse({ id: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('labItemIdParamSchema', () => {
  it('coacciona item_id numérico de ruta', () => {
    expect(labItemIdParamSchema.parse({ item_id: '7' })).toEqual({ item_id: 7 });
  });

  it('rechaza item_id inválido', () => {
    expect(labItemIdParamSchema.safeParse({ item_id: 'abc' }).success).toBe(false);
    expect(labItemIdParamSchema.safeParse({ item_id: '-1' }).success).toBe(false);
  });
});

describe('labRequestStatusSchema', () => {
  it('acepta un status no vacío', () => {
    expect(labRequestStatusSchema.parse({ status: 'received' }).status).toBe('received');
  });

  it('rechaza vacío o demasiado largo', () => {
    expect(labRequestStatusSchema.safeParse({ status: '' }).success).toBe(false);
    expect(labRequestStatusSchema.safeParse({ status: 'x'.repeat(51) }).success).toBe(false);
  });

  it('rechaza ausente', () => {
    expect(labRequestStatusSchema.safeParse({}).success).toBe(false);
  });
});

describe('labItemStatusSchema', () => {
  it('acepta un status no vacío', () => {
    expect(labItemStatusSchema.parse({ status: 'processing' }).status).toBe('processing');
  });

  it('rechaza vacío', () => {
    expect(labItemStatusSchema.safeParse({ status: '' }).success).toBe(false);
  });
});

describe('labTypeSchema', () => {
  it('acepta internal y external', () => {
    expect(labTypeSchema.parse({ lab_type: 'internal' }).lab_type).toBe('internal');
    expect(labTypeSchema.parse({ lab_type: 'external' }).lab_type).toBe('external');
  });

  it('rechaza valores fuera del enum', () => {
    expect(labTypeSchema.safeParse({ lab_type: 'third-party' }).success).toBe(false);
  });
});

describe('labItemResultSchema', () => {
  it('acepta result_value string y coacciona número a string', () => {
    expect(labItemResultSchema.parse({ result_value: '10.5' }).result_value).toBe('10.5');
    expect(labItemResultSchema.parse({ result_value: 7 }).result_value).toBe('7');
  });

  it('acepta result_notes opcional', () => {
    const parsed = labItemResultSchema.parse({ result_value: '5', result_notes: 'ok' });
    expect(parsed.result_notes).toBe('ok');
  });

  it('rechaza result_value ausente', () => {
    expect(labItemResultSchema.safeParse({ result_notes: 'x' }).success).toBe(false);
  });
});

describe('labDeliverSchema', () => {
  it('acepta method opcional y ausente', () => {
    expect(labDeliverSchema.parse({ method: 'email' }).method).toBe('email');
    expect(labDeliverSchema.parse({})).toEqual({});
  });

  it('rechaza method vacío', () => {
    expect(labDeliverSchema.safeParse({ method: '' }).success).toBe(false);
  });
});

describe('labRejectSampleSchema', () => {
  it('acepta rejection_reason no vacío', () => {
    expect(labRejectSampleSchema.parse({ rejection_reason: 'hemolizada' }).rejection_reason).toBe('hemolizada');
  });

  it('rechaza vacío o ausente', () => {
    expect(labRejectSampleSchema.safeParse({ rejection_reason: '' }).success).toBe(false);
    expect(labRejectSampleSchema.safeParse({}).success).toBe(false);
  });
});

describe('labReagentStockSchema', () => {
  it('acepta quantity numérica (incluye negativos)', () => {
    expect(labReagentStockSchema.parse({ quantity: 10 }).quantity).toBe(10);
    expect(labReagentStockSchema.parse({ quantity: -2 }).quantity).toBe(-2);
  });

  it('rechaza no numérico o no finito', () => {
    expect(labReagentStockSchema.safeParse({ quantity: '10' }).success).toBe(false);
    expect(labReagentStockSchema.safeParse({ quantity: Infinity }).success).toBe(false);
  });
});

describe('status enums de laboratorio', () => {
  it('labRequestStatusSchema rechaza valores fuera del catálogo', () => {
    expect(labRequestStatusSchema.safeParse({ status: 'in_progress' }).success).toBe(false);
    expect(labRequestStatusSchema.safeParse({ status: 'no-existe' }).success).toBe(false);
  });

  it('labItemStatusSchema acepta cada valor del catálogo', () => {
    for (const status of LAB_REQUEST_STATUSES) {
      expect(labItemStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

describe('labTestCreateSchema / labTestUpdateSchema', () => {
  it('create exige name y coacciona numéricos', () => {
    expect(labTestCreateSchema.safeParse({}).success).toBe(false);
    const parsed = labTestCreateSchema.parse({ name: 'Glucosa', price: '12.5', reference_min: '70' });
    expect(parsed).toMatchObject({ name: 'Glucosa', price: 12.5, reference_min: 70 });
  });

  it('create descarta campos desconocidos', () => {
    const parsed = labTestCreateSchema.parse({ name: 'Glucosa', hack: 'x' });
    expect(parsed).not.toHaveProperty('hack');
  });

  it('update acepta body vacío (el service decide) y tipos válidos', () => {
    expect(labTestUpdateSchema.safeParse({}).success).toBe(true);
    expect(labTestUpdateSchema.parse({ active: false }).active).toBe(false);
    expect(labTestUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
  });
});

describe('labAreaCreateSchema', () => {
  it('exige name y code', () => {
    expect(labAreaCreateSchema.safeParse({ name: 'Hematología' }).success).toBe(false);
    expect(labAreaCreateSchema.safeParse({ name: 'Hematología', code: 'HEM' }).success).toBe(true);
  });

  it('rechaza code demasiado largo', () => {
    expect(labAreaCreateSchema.safeParse({ name: 'X', code: 'C'.repeat(21) }).success).toBe(false);
  });
});

describe('labEquipment schemas', () => {
  it('create exige name y valida enum de connection_type/status', () => {
    expect(labEquipmentCreateSchema.safeParse({ name: 'Cobas' }).success).toBe(true);
    expect(labEquipmentCreateSchema.safeParse({}).success).toBe(false);
    expect(labEquipmentCreateSchema.safeParse({ name: 'X', connection_type: 'bluetooth' }).success).toBe(false);
    expect(labEquipmentCreateSchema.safeParse({ name: 'X', status: 'broken' }).success).toBe(false);
  });

  it('create acota port', () => {
    expect(labEquipmentCreateSchema.safeParse({ name: 'X', port: 70000 }).success).toBe(false);
    expect(labEquipmentCreateSchema.parse({ name: 'X', port: '8080' }).port).toBe(8080);
  });

  it('update acepta body vacío y status nullish', () => {
    expect(labEquipmentUpdateSchema.safeParse({}).success).toBe(true);
    expect(labEquipmentUpdateSchema.parse({ status: null })).toEqual({ status: null });
  });
});

describe('labReagentCreateSchema', () => {
  it('exige name y coacciona stock', () => {
    expect(labReagentCreateSchema.safeParse({}).success).toBe(false);
    expect(labReagentCreateSchema.parse({ name: 'Reactivo', current_stock: '4' }).current_stock).toBe(4);
  });
});

describe('labSample schemas', () => {
  it('create exige sample_type', () => {
    expect(labSampleCreateSchema.safeParse({}).success).toBe(false);
    expect(labSampleCreateSchema.safeParse({ sample_type: 'blood' }).success).toBe(true);
  });

  it('receive acepta body vacío', () => {
    expect(labSampleReceiveSchema.parse({})).toEqual({});
    expect(labSampleReceiveSchema.parse({ reception_time: '2026-01-01T00:00:00Z' }).reception_time).toBe('2026-01-01T00:00:00Z');
  });

  it('assign exige assigned_tech_id', () => {
    expect(labSampleAssignSchema.safeParse({}).success).toBe(false);
    expect(labSampleAssignSchema.parse({ assigned_tech_id: '3' }).assigned_tech_id).toBe(3);
  });

  it('qc exige qc_status', () => {
    expect(labSampleQcSchema.safeParse({}).success).toBe(false);
    expect(labSampleQcSchema.parse({ qc_status: 'passed' }).qc_status).toBe('passed');
  });
});

describe('labQcCreateSchema', () => {
  it('exige qc_type, control_name y status del enum', () => {
    expect(labQcCreateSchema.safeParse({}).success).toBe(false);
    expect(labQcCreateSchema.safeParse({ qc_type: 'internal', control_name: 'C1' }).success).toBe(false);
    expect(labQcCreateSchema.safeParse({ qc_type: 'internal', control_name: 'C1', status: 'passed' }).success).toBe(true);
    expect(labQcCreateSchema.safeParse({ qc_type: 'internal', control_name: 'C1', status: 'ok' }).success).toBe(false);
  });

  it('acepta opcionales null y coacciona medidas', () => {
    const parsed = labQcCreateSchema.parse({
      qc_type: 'internal', control_name: 'C1', status: 'review',
      equipment_id: null, notes: null, measured_value: '5.2',
    });
    expect(parsed).toMatchObject({ equipment_id: null, notes: null, measured_value: 5.2 });
  });
});

describe('labResultsEmailSchema', () => {
  it('lab_request_id opcional y coaccionado', () => {
    expect(labResultsEmailSchema.parse({})).toEqual({});
    expect(labResultsEmailSchema.parse({ lab_request_id: '9' }).lab_request_id).toBe(9);
    expect(labResultsEmailSchema.safeParse({ lab_request_id: -1 }).success).toBe(false);
  });
});