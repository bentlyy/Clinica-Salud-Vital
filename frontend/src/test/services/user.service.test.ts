import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '@/modules/users/services/user.service';
import { apiClient } from '@/shared/services/api-client';

vi.mock('@/shared/services/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('calls GET /doctors/users with params and maps backend rows to User', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          data: [
            {
              id: 1,
              email: 'ana@clinic.cl',
              name: 'Ana Pérez',
              role: 'doctor',
              rut: '11.111.111-1',
              phone: '+56 9 1111 1111',
              active: true,
              created_at: '2024-05-01T10:00:00Z',
            },
          ],
          pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
        },
      });

      const result = await userService.list({ page: 2, limit: 10 });

      expect(mockedApi.get).toHaveBeenCalledWith('/doctors/users', {
        params: { page: 2, limit: 10 },
      });
      expect(result.data).toEqual([
        {
          id: 1,
          email: 'ana@clinic.cl',
          name: 'Ana Pérez',
          role: 'doctor',
          is_active: true,
          rut: '11.111.111-1',
          phone: '+56 9 1111 1111',
          created_at: '2024-05-01T10:00:00Z',
          updated_at: '2024-05-01T10:00:00Z',
        },
      ]);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it('maps active=false to is_active=false', async () => {
      mockedApi.get.mockResolvedValue({
        data: { data: [{ id: 2, email: 'b@x.cl', name: 'Ben', role: 'patient', active: false, created_at: '2024-01-01T00:00:00Z' }] },
      });
      const result = await userService.list();
      expect(result.data[0].is_active).toBe(false);
    });

    it('falls back to defaults when pagination is missing', async () => {
      mockedApi.get.mockResolvedValue({ data: { data: [] } });
      const result = await userService.list();
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 0, totalPages: 1 });
    });
  });

  describe('toggleActive', () => {
    it('PATCHes /doctors/users/:id/active and maps active to is_active', async () => {
      mockedApi.patch.mockResolvedValue({ data: { active: true } });
      const result = await userService.toggleActive(7);
      expect(mockedApi.patch).toHaveBeenCalledWith('/doctors/users/7/active', undefined, undefined);
      expect(result).toEqual({ is_active: true });
    });
  });

  describe('registerDoctor', () => {
    it('POSTs /doctors/register and maps the doctor payload to a User', async () => {
      const input = { name: 'Dra. Ana', email: 'ana@clinic.cl', specialty: 'Cardiología', rut: '1-9', phone: '+56 9' };
      mockedApi.post.mockResolvedValue({
        data: { doctor: { id: 9, user_id: 99, name: 'Dra. Ana' } },
      });
      const result = await userService.registerDoctor(input);
      expect(mockedApi.post).toHaveBeenCalledWith('/doctors/register', input, undefined);
      expect(result).toEqual({
        id: 99,
        name: 'Dra. Ana',
        email: 'ana@clinic.cl',
        role: 'doctor',
        is_active: true,
        rut: '1-9',
        phone: '+56 9',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });
  });

  describe('invitePerson', () => {
    it('POSTs /doctors/invite and returns the message', async () => {
      const input = { name: 'Paciente', email: 'p@clinic.cl', role: 'patient' as const };
      mockedApi.post.mockResolvedValue({ data: { message: 'Invitación enviada' } });
      const result = await userService.invitePerson(input);
      expect(mockedApi.post).toHaveBeenCalledWith('/doctors/invite', input, undefined);
      expect(result).toEqual({ message: 'Invitación enviada' });
    });
  });
});
