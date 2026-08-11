import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { EmptySpecialties } from '@/modules/specialties/components/EmptySpecialties';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    notFound: 'No se encontraron especialidades',
    emptySearch: 'Ajusta los filtros o intenta con otros términos.',
    emptyNone: 'Crea tu primera especialidad para comenzar.',
    newSpecialty: 'Nueva Especialidad',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

describe('EmptySpecialties', () => {
  it('renders the title and the empty search message when searching', () => {
    render(
      <AppThemeProvider>
        <EmptySpecialties hasSearch onCreate={vi.fn()} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('No se encontraron especialidades')).toBeInTheDocument();
    expect(screen.getByText('Ajusta los filtros o intenta con otros términos.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the create CTA when there is no active search', () => {
    const onCreate = vi.fn();
    render(
      <AppThemeProvider>
        <EmptySpecialties hasSearch={false} onCreate={onCreate} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Crea tu primera especialidad para comenzar.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva Especialidad' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
