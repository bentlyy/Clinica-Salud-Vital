import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

import { doctorService } from '@/modules/doctors/services/doctor.service';

function rawDoctor(id = 1, overrides: Record<string, unknown> = {}) {
  return {
    id,
    user_id: 100 + id,
    name: 'Juan Perez',
    email: 'juan@clinic.com',
    specialty: 'Cardiología',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('doctorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns a paginated response when the API returns an array', async () => {
      apiClient.get.mockResolvedValue({ data: [rawDoctor(1), rawDoctor(2)] });

      const result = await doctorService.list();

      expect(apiClient.get).toHaveBeenCalledWith('/doctors', undefined);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('reads the data array when the API returns a paginated payload', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [rawDoctor(1)], total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await doctorService.list();
      expect(result.data).toHaveLength(1);
    });

    it('filters by search across name, specialty and email (case-insensitive)', async () => {
      apiClient.get.mockResolvedValue({
        data: [
          rawDoctor(1, { name: 'Ana Torres', specialty: 'Dermatología', email: 'ana@clinic.com' }),
          rawDoctor(2, { name: 'Luis Soto', specialty: 'Cardiología', email: 'luis@clinic.com' }),
          rawDoctor(3, { name: 'Carla Diaz', specialty: 'Traumatología', email: 'carla@clinic.com' }),
        ],
      });

      const byName = await doctorService.list({ search: 'torres' });
      expect(byName.data.map((d) => d.id)).toEqual([1]);

      const bySpecialty = await doctorService.list({ search: 'CARDIOLO' });
      expect(bySpecialty.data.map((d) => d.id)).toEqual([2]);

      const byEmail = await doctorService.list({ search: 'carla@clinic.com' });
      expect(byEmail.data.map((d) => d.id)).toEqual([3]);
    });
  });

  describe('listPublic', () => {
    it('returns the array directly when the payload is an array', async () => {
      apiClient.get.mockResolvedValue({ data: [rawDoctor(1)] });
      await expect(doctorService.listPublic()).resolves.toHaveLength(1);
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/public', undefined);
    });

    it('reads data.data when the payload is wrapped', async () => {
      apiClient.get.mockResolvedValue({ data: { data: [rawDoctor(1), rawDoctor(2)] } });
      await expect(doctorService.listPublic()).resolves.toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('calls GET /doctors/:id', async () => {
      apiClient.get.mockResolvedValue({ data: rawDoctor(7) });
      const result = await doctorService.getById(7);
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/7', undefined);
      expect(result.id).toBe(7);
    });
  });

  describe('create', () => {
    it('posts the input to /doctors', async () => {
      const input = { name: 'Nuevo', email: 'nuevo@clinic.com' };
      apiClient.post.mockResolvedValue({ data: rawDoctor(9, input) });
      const result = await doctorService.create(input);
      expect(apiClient.post).toHaveBeenCalledWith('/doctors', input, undefined);
      expect(result.name).toBe('Nuevo');
    });
  });

  describe('update', () => {
    it('patches /doctors/:id with the input', async () => {
      const input = { name: 'Actualizado' };
      apiClient.patch.mockResolvedValue({ data: rawDoctor(3, input) });
      const result = await doctorService.update(3, input);
      expect(apiClient.patch).toHaveBeenCalledWith('/doctors/3', input, undefined);
      expect(result.name).toBe('Actualizado');
    });
  });

  describe('invite', () => {
    it('posts the email to /doctors/:id/invite', async () => {
      apiClient.post.mockResolvedValue({ data: { message: 'Invitación enviada' } });
      const result = await doctorService.invite(4, 'doc@clinic.com');
      expect(apiClient.post).toHaveBeenCalledWith('/doctors/4/invite', { email: 'doc@clinic.com' }, undefined);
      expect(result.message).toBe('Invitación enviada');
    });
  });

  describe('getStats', () => {
    it('calls GET /doctors/:id/stats', async () => {
      const stats = { total_patients: 5, total_appointments: 10, today_appointments: 2, completed_appointments: 8, monthly_revenue: 15000 };
      apiClient.get.mockResolvedValue({ data: stats });
      const result = await doctorService.getStats(2);
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/2/stats', undefined);
      expect(result).toEqual(stats);
    });
  });

  describe('getSchedule', () => {
    it('calls GET /doctors/:id/schedule', async () => {
      const schedule = [{ id: 1, doctor_id: 2, day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true }];
      apiClient.get.mockResolvedValue({ data: schedule });
      const result = await doctorService.getSchedule(2);
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/2/schedule', undefined);
      expect(result).toEqual(schedule);
    });
  });
});
