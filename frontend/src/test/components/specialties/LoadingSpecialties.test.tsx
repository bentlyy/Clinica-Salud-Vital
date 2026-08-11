import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { LoadingSpecialties } from '@/modules/specialties/components/LoadingSpecialties';

describe('LoadingSpecialties', () => {
  it('renders four stat card skeletons and three row skeletons', () => {
    const { container } = render(
      <AppThemeProvider>
        <LoadingSpecialties />
      </AppThemeProvider>,
    );
    // 4 stat cards + 3 row skeletons
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(7);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });
});
