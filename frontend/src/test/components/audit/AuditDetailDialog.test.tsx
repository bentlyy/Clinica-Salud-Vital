import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { AuditDetailDialog } from '@/modules/audit/components/AuditDetailDialog';
import type { AuditLog } from '@/modules/audit/types/audit.types';

vi.mock('@/i18n/i18n', () => ({ default: { language: 'es', on: vi.fn() } }));

const log: AuditLog = {
  id: 1,
  tenant_id: 1,
  user_id: 7,
  user_name: 'Dra. Ana',
  action: 'create',
  entity_type: 'patient',
  entity_id: 42,
  details: { field: 'name' },
  ip_address: '127.0.0.1',
  created_at: '2026-01-01T12:00:00',
};

function renderDialog(overrides: Partial<{ open: boolean; log: AuditLog | null }> = {}) {
  const { open = true, log: l = log } = overrides;
  render(
    <AppThemeProvider>
      <AuditDetailDialog open={open} onClose={vi.fn()} log={l} />
    </AppThemeProvider>,
  );
}

describe('AuditDetailDialog', () => {
  it('renders nothing when log is null', () => {
    renderDialog({ log: null });
    expect(screen.queryByText('Detalle de Auditoría')).not.toBeInTheDocument();
  });

  it('maps action and entity labels and shows user, ip and the details JSON', () => {
    renderDialog();
    expect(screen.getByText('Detalle de Auditoría')).toBeInTheDocument();
    // 'Creación' appears in the action chip and in the table row
    expect(screen.getAllByText('Creación').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Paciente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ID: 42')).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('Detalles Adicionales')).toBeInTheDocument();
    expect(screen.getByText(/"field": "name"/)).toBeInTheDocument();
  });

  it('falls back to raw action/entity labels and the user id when fields are missing', () => {
    renderDialog({
      log: {
        ...log,
        user_name: undefined,
        action: 'mystery_action',
        entity_type: 'unknown_entity',
        entity_id: undefined,
        details: undefined,
        ip_address: undefined,
      },
    });
    // raw labels appear both in the chip and in the table row
    expect(screen.getAllByText('mystery_action').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('unknown_entity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Usuario #7')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('ID Entidad')).not.toBeInTheDocument();
    expect(screen.queryByText('Detalles Adicionales')).not.toBeInTheDocument();
  });
});
