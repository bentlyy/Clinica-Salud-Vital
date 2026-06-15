import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as specialtiesService from '../../src/modules/specialties/specialties.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('specialtiesService.getAllSpecialties', () => {
  it('returns all specialties ordered', async () => {
    const result = await specialtiesService.getAllSpecialties();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
  });
});

describe('specialtiesService.createSpecialty', () => {
  it('throws if name is empty', async () => {
    await expect(specialtiesService.createSpecialty('')).rejects.toThrow('Name is required');
    await expect(specialtiesService.createSpecialty('   ')).rejects.toThrow('Name is required');
  });

  it('successfully creates from valid name', async () => {
    const result = await specialtiesService.createSpecialty('Cardiología');
    expect(result.id).toBe(3);
    expect(result.name).toBe('Cardiología');
  });

  it('throws for invalid specialty', async () => {
    await expect(specialtiesService.createSpecialty('InvalidSpecialty')).rejects.toThrow('La especialidad no es válida');
  });
});

describe('specialtiesService.ensureSpecialty', () => {
  it('returns specialty if valid', async () => {
    const result = await specialtiesService.ensureSpecialty('Neurología');
    expect(result.id).toBe(10);
    expect(result.name).toBe('Neurología');
  });

  it('throws for invalid specialty', async () => {
    await expect(specialtiesService.ensureSpecialty('Bogus')).rejects.toThrow('Invalid specialty');
  });

  it('throws if name is empty', async () => {
    await expect(specialtiesService.ensureSpecialty('')).rejects.toThrow('Name is required');
  });
});
