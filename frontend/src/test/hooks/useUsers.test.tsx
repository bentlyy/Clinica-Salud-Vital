import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useUserList,
  useRegisterDoctor,
  useInviteUser,
  useToggleUserActive,
} from '@/modules/users/hooks/useUsers';
import { userService } from '@/modules/users/services/user.service';
import type { User } from '@/modules/users/types/user.types';
import toast from 'react-hot-toast';

vi.mock('@/modules/users/services/user.service', () => ({
  userService: {
    list: vi.fn(),
    registerDoctor: vi.fn(),
    invitePerson: vi.fn(),
    toggleActive: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedService = vi.mocked(userService);
const mockedToast = vi.mocked(toast);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'ana@clinic.cl',
    name: 'Ana Pérez',
    role: 'doctor',
    is_active: true,
    rut: '11.111.111-1',
    phone: '+56 9 1111 1111',
    created_at: '2024-05-01T10:00:00Z',
    updated_at: '2024-05-01T10:00:00Z',
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches users with params, forwards signal and returns data', async () => {
    const user = makeUser();
    mockedService.list.mockResolvedValue({ data: [user], total: 1, page: 1, limit: 10, totalPages: 1 });

    const { result } = renderHook(() => useUserList({ page: 1, limit: 10, search: 'ana' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedService.list).toHaveBeenCalledWith(
      { page: 1, limit: 10, search: 'ana' },
      { signal: expect.anything() },
    );
    expect(result.current.data?.data).toEqual([user]);
  });

  it('propagates errors from the service', async () => {
    mockedService.list.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useUserList({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useRegisterDoctor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a doctor, invalidates the list and shows a success toast', async () => {
    mockedService.registerDoctor.mockResolvedValue(makeUser());

    const { result } = renderHook(() => useRegisterDoctor(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'Ana', email: 'ana@clinic.cl', specialty: 'Cardiología' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.registerDoctor).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@clinic.cl',
      specialty: 'Cardiología',
    });
    expect(mockedToast.success).toHaveBeenCalledWith('userCreated');
  });
});

describe('useInviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invites a person and shows a success toast', async () => {
    mockedService.invitePerson.mockResolvedValue({ message: 'ok' });

    const { result } = renderHook(() => useInviteUser(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'Paciente', email: 'p@clinic.cl', role: 'patient' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.invitePerson).toHaveBeenCalledWith({
      name: 'Paciente',
      email: 'p@clinic.cl',
      role: 'patient',
    });
    expect(mockedToast.success).toHaveBeenCalledWith('inviteSent');
  });
});

describe('useToggleUserActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows activation toast when the user becomes active', async () => {
    mockedService.toggleActive.mockResolvedValue({ is_active: true });

    const { result } = renderHook(() => useToggleUserActive(), { wrapper: createWrapper() });
    result.current.mutate(5);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedService.toggleActive).toHaveBeenCalledWith(5);
    expect(mockedToast.success).toHaveBeenCalledWith('userActivated');
  });

  it('shows deactivation toast when the user becomes inactive', async () => {
    mockedService.toggleActive.mockResolvedValue({ is_active: false });

    const { result } = renderHook(() => useToggleUserActive(), { wrapper: createWrapper() });
    result.current.mutate(5);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedToast.success).toHaveBeenCalledWith('userDeactivated');
  });
});
