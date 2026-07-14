import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetAllSpecialties, mockGetSpecialtyById, mockCreateSpecialty, mockUpdateSpecialty, mockDeleteSpecialty } = vi.hoisted(() => ({
  mockGetAllSpecialties: vi.fn(),
  mockGetSpecialtyById: vi.fn(),
  mockCreateSpecialty: vi.fn(),
  mockUpdateSpecialty: vi.fn(),
  mockDeleteSpecialty: vi.fn(),
}));

vi.mock('../../src/modules/specialties/specialties.service.js', () => ({
  getAllSpecialties: mockGetAllSpecialties,
  getSpecialtyById: mockGetSpecialtyById,
  createSpecialty: mockCreateSpecialty,
  updateSpecialty: mockUpdateSpecialty,
  deleteSpecialty: mockDeleteSpecialty,
}));

vi.mock('../../src/middlewares/asyncHandler.middleware.js', () => ({
  asyncHandler: (fn) => fn,
}));

import * as controller from '../../src/modules/specialties/specialties.controller.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const res = () => {
  const r = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return r;
};

describe('specialtiesController.getSpecialties', () => {
  it('returns all specialties', async () => {
    mockGetAllSpecialties.mockResolvedValue([{ id: 1, name: 'Cardio' }]);
    const response = res();
    await controller.getSpecialties({}, response);
    expect(response.json).toHaveBeenCalledWith([{ id: 1, name: 'Cardio' }]);
  });
});

describe('specialtiesController.getSpecialtyById', () => {
  it('returns specialty by id', async () => {
    mockGetSpecialtyById.mockResolvedValue({ id: 1, name: 'Cardio' });
    const response = res();
    await controller.getSpecialtyById({ params: { id: '1' } }, response);
    expect(response.json).toHaveBeenCalledWith({ id: 1, name: 'Cardio' });
  });
});

describe('specialtiesController.createSpecialty', () => {
  it('creates specialty and returns 201', async () => {
    mockCreateSpecialty.mockResolvedValue({ id: 1, name: 'Neuro' });
    const response = res();
    await controller.createSpecialty({ body: { name: 'Neuro' } }, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ id: 1, name: 'Neuro' });
  });

  it('throws when name is missing', async () => {
    const response = res();
    await expect(controller.createSpecialty({ body: {} }, response)).rejects.toThrow('Name is required');
  });
});

describe('specialtiesController.updateSpecialty', () => {
  it('updates specialty', async () => {
    mockUpdateSpecialty.mockResolvedValue({ id: 1, name: 'Updated' });
    const response = res();
    await controller.updateSpecialty({ params: { id: '1' }, body: { name: 'Updated' } }, response);
    expect(response.json).toHaveBeenCalledWith({ id: 1, name: 'Updated' });
  });
});

describe('specialtiesController.deleteSpecialty', () => {
  it('deletes specialty', async () => {
    mockDeleteSpecialty.mockResolvedValue();
    const response = res();
    await controller.deleteSpecialty({ params: { id: '1' } }, response);
    expect(response.json).toHaveBeenCalledWith({ message: 'Specialty deleted' });
  });
});
