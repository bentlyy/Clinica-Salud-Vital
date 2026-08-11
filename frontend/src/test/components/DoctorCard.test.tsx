import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DoctorCard } from '@/modules/doctors/components/DoctorCard';
import type { Doctor, DoctorStats } from '@/modules/doctors/types/doctor.types';

const doctor: Doctor = {
  id: 1,
  user_id: 10,
  name: 'Juan Perez',
  email: 'juan@clinic.com',
  specialty: 'Cardiología',
  license_number: 'LIC-123',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const doctorWithoutUser: Doctor = {
  id: 2,
  user_id: 0,
  name: 'Ana Torres',
  email: 'ana@clinic.com',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const stats: DoctorStats = {
  total_patients: 5,
  total_appointments: 10,
  today_appointments: 2,
  completed_appointments: 8,
  monthly_revenue: 25000,
};

function renderCard(overrides: {
  doctor?: Doctor;
  canEdit?: boolean;
  canInvite?: boolean;
  withStats?: boolean;
  onEdit?: (d: Doctor) => void;
  onInvite?: (d: Doctor) => void;
  onViewSchedule?: (d: Doctor) => void;
} = {}) {
  const {
    doctor: doc = doctor,
    canEdit = true,
    canInvite = true,
    withStats = true,
    onEdit = vi.fn(),
    onInvite = vi.fn(),
    onViewSchedule = vi.fn(),
  } = overrides;
  render(
    <AppThemeProvider>
      <DoctorCard
        doctor={doc}
        stats={withStats ? stats : undefined}
        onEdit={onEdit}
        onViewSchedule={onViewSchedule}
        onInvite={onInvite}
        canEdit={canEdit}
        canInvite={canInvite}
      />
    </AppThemeProvider>,
  );
  return { onEdit, onInvite, onViewSchedule };
}

describe('DoctorCard', () => {
  it('renders the doctor name, specialty and license', () => {
    renderCard();
    expect(screen.getByText('Dr. Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByText(/LIC-123/)).toBeInTheDocument();
  });

  it('shows the stats block with totals', () => {
    renderCard();
    expect(screen.getByText('patients')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('today_appointments')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('hides the stats block when stats are missing', () => {
    renderCard({ withStats: false });
    expect(screen.queryByText('patients')).not.toBeInTheDocument();
  });

  it('renders the initials in the avatar', () => {
    renderCard();
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('calls onViewSchedule from the calendar button', () => {
    const { onViewSchedule } = renderCard();
    fireEvent.click(screen.getByTestId('CalendarMonthIcon').closest('button') as HTMLButtonElement);
    expect(onViewSchedule).toHaveBeenCalledWith(doctor);
  });

  it('calls onEdit from the edit button', () => {
    const { onEdit } = renderCard();
    fireEvent.click(screen.getByTestId('EditIcon').closest('button') as HTMLButtonElement);
    expect(onEdit).toHaveBeenCalledWith(doctor);
  });

  it('hides the edit button when canEdit is false', () => {
    renderCard({ canEdit: false });
    expect(screen.queryByTestId('EditIcon')).not.toBeInTheDocument();
  });

  it('shows the invite button only when canInvite and the doctor has no user account', () => {
    const { onInvite } = renderCard({ doctor: doctorWithoutUser, canInvite: true });
    fireEvent.click(screen.getByTestId('MailIcon').closest('button') as HTMLButtonElement);
    expect(onInvite).toHaveBeenCalledWith(doctorWithoutUser);
  });

  it('hides the invite button when the doctor already has a user account', () => {
    renderCard({ doctor, canInvite: true });
    expect(screen.queryByTestId('MailIcon')).not.toBeInTheDocument();
  });
});
