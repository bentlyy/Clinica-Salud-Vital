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

import * as specialtiesService from '../../src/modules/specialties/specialties.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('specialtiesService.getAllSpecialties', () => {
  it('returns all specialties ordered by name', async () => {
    const mockSpecialties = [
      { id: 2, name: 'Cardiología' },
      { id: 1, name: 'Medicina General' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockSpecialties });

    const result = await specialtiesService.getAllSpecialties();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Cardiología');
  });

  it('returns empty array if no specialties', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await specialtiesService.getAllSpecialties();

    expect(result).toEqual([]);
  });
});

describe('specialtiesService.createSpecialty', () => {
  it('throws if name is empty', async () => {
    await expect(specialtiesService.createSpecialty('')).rejects.toThrow('Name is required');
    await expect(specialtiesService.createSpecialty('   ')).rejects.toThrow('Name is required');
  });

  it('creates specialty successfully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cardiología' }] });

    const result = await specialtiesService.createSpecialty('Cardiología');

    expect(result.id).toBe(1);
    expect(result.name).toBe('Cardiología');
  });

  it('throws if specialty already exists', async () => {
    const error = new Error('Duplicate key');
    error.code = '23505';
    mockQuery.mockRejectedValueOnce(error);

    await expect(specialtiesService.createSpecialty('Cardiología')).rejects.toThrow('La especialidad ya existe');
  });

  it('throws original error for non-unique constraint errors', async () => {
    const error = new Error('Foreign key violation');
    error.code = '23503';
    mockQuery.mockRejectedValueOnce(error);

    await expect(specialtiesService.createSpecialty('Cardiología')).rejects.toThrow('Foreign key violation');
  });
});

describe('specialtiesService.ensureSpecialty', () => {
  it('creates specialty if not exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Neurología' }] });

    const result = await specialtiesService.ensureSpecialty('Neurología');

    expect(result.id).toBe(1);
  });

  it('returns existing specialty on conflict', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cardiología' }] });

    const result = await specialtiesService.ensureSpecialty('Cardiología');

    expect(result.name).toBe('Cardiología');
  });

  it('throws if name is empty', async () => {
    await expect(specialtiesService.ensureSpecialty('')).rejects.toThrow('Name is required');
  });
});
