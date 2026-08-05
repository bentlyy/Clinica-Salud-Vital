import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../src/utils/errors.js', async () => {
  const { ERROR_MESSAGES } = await vi.importActual('../../src/utils/error-codes.js');
  return {
    BadRequestError: class BadRequestError extends Error {
      constructor(msg) {
        const resolved = (typeof msg === 'string' && msg in ERROR_MESSAGES) ? ERROR_MESSAGES[msg] : msg;
        super(resolved);
        this.name = 'BadRequestError';
      }
    },
  };
});

import * as specialtiesService from '../../src/modules/specialties/specialties.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('specialtiesService.getAllSpecialties', () => {
  it('returns all specialties with doctors grouped', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Cardiología', icon: 'heart', description: 'Heart', department: 'Medicina', procedures: '["ECG","Echo"]', color: '#ff0000' },
      ],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Dr. Cardio', email: 'cardio@test.com', specialty: 'Cardiología' },
        { id: 2, name: 'Dr. Cardio2', email: 'cardio2@test.com', specialty: 'Cardiología' },
      ],
    });

    const result = await specialtiesService.getAllSpecialties();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cardiología');
    expect(result[0].procedures).toEqual(['ECG', 'Echo']);
    expect(result[0].doctors).toHaveLength(2);
    expect(result[0].doctors[0].name).toBe('Dr. Cardio');
  });

  it('handles procedures as array already', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Cardiología', icon: null, description: null, department: null, procedures: ['ECG'], color: null },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await specialtiesService.getAllSpecialties();

    expect(result[0].procedures).toEqual(['ECG']);
  });

  it('handles null procedures', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Cardiología', icon: null, description: null, department: null, procedures: null, color: null },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await specialtiesService.getAllSpecialties();

    expect(result[0].procedures).toEqual([]);
  });

  it('returns empty array when no specialties', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await specialtiesService.getAllSpecialties();

    expect(result).toEqual([]);
  });
});

describe('specialtiesService.createSpecialty', () => {
  it('creates a new specialty', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Neurología', icon: null, description: null, department: null, procedures: null, color: null }],
    });

    const result = await specialtiesService.createSpecialty('  Neurología  ');

    expect(result.name).toBe('Neurología');
    expect(mockQuery.mock.calls[1][1]).toContain('Neurología');
  });

  it('returns existing specialty if already exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Cardiología', icon: null, description: null, department: null, procedures: '["ECG"]', color: null }],
    });

    const result = await specialtiesService.createSpecialty('Cardiología');

    expect(result.name).toBe('Cardiología');
    expect(result.procedures).toEqual(['ECG']);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestError for empty name', async () => {
    await expect(specialtiesService.createSpecialty('')).rejects.toThrow('Name is required');
    await expect(specialtiesService.createSpecialty('   ')).rejects.toThrow('Name is required');
  });
});

describe('specialtiesService.getSpecialtyById', () => {
  it('returns specialty by id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Cardiología', icon: null, description: null, department: null, procedures: '["ECG"]', color: null }],
    });

    const result = await specialtiesService.getSpecialtyById(1);

    expect(result.name).toBe('Cardiología');
  });

  it('throws BadRequestError when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(specialtiesService.getSpecialtyById(999)).rejects.toThrow('Specialty not found');
  });
});

describe('specialtiesService.updateSpecialty', () => {
  it('updates specialty fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Cardio Updated', icon: 'heart', description: 'Desc', department: 'Med', procedures: '["ECG"]', color: '#00ff00' }],
    });

    const result = await specialtiesService.updateSpecialty(1, { name: 'Cardio Updated', color: '#00ff00' });

    expect(result.name).toBe('Cardio Updated');
    expect(result.color).toBe('#00ff00');
  });

  it('updates procedures as JSON', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Cardio', icon: null, description: null, department: null, procedures: '["ECG","MRI"]', color: null }],
    });

    const result = await specialtiesService.updateSpecialty(1, { procedures: ['ECG', 'MRI'] });

    expect(result.procedures).toEqual(['ECG', 'MRI']);
    expect(mockQuery.mock.calls[0][1]).toContain('["ECG","MRI"]');
  });

  it('throws BadRequestError when no fields to update', async () => {
    await expect(specialtiesService.updateSpecialty(1, {})).rejects.toThrow('No fields to update');
  });

  it('throws BadRequestError when specialty not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(specialtiesService.updateSpecialty(999, { name: 'Nuevo' })).rejects.toThrow('Specialty not found');
  });
});

describe('specialtiesService.deleteSpecialty', () => {
  it('deletes specialty successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await specialtiesService.deleteSpecialty(1);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM specialties'),
      [1, 'default']
    );
  });

  it('throws BadRequestError when specialty not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    await expect(specialtiesService.deleteSpecialty(999)).rejects.toThrow('Specialty not found');
  });
});

describe('specialtiesService.ensureSpecialty', () => {
  it('returns existing specialty if found', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Cardiología', icon: null, description: null, department: null, procedures: null, color: null }],
    });

    const result = await specialtiesService.ensureSpecialty('Cardiología');

    expect(result.name).toBe('Cardiología');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('creates specialty if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Neurología', icon: null, description: null, department: null, procedures: null, color: null }],
    });

    const result = await specialtiesService.ensureSpecialty('  Neurología  ');

    expect(result.name).toBe('Neurología');
  });

  it('throws BadRequestError for empty name', async () => {
    await expect(specialtiesService.ensureSpecialty('')).rejects.toThrow('Name is required');
    await expect(specialtiesService.ensureSpecialty('   ')).rejects.toThrow('Name is required');
  });
});
