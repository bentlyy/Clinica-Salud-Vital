import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import LabTestsCatalogPage from '@/modules/laboratory/pages/LabTestsCatalogPage';

const service = vi.hoisted(() => ({ getLabTests: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/modules/laboratory/services/lab.service', () => service);

const tests = [
  {
    id: 1,
    name: 'Hemograma',
    code: 'HEM001',
    category: 'Hematologia',
    description: 'Recuento celular',
    price: 15000,
    unit: '',
    reference_min: null,
    reference_max: null,
    reference_ranges: {},
    active: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: 'Perfil Tiroideo',
    code: 'HOR001',
    category: 'Hormonas',
    description: 'TSH, T3, T4',
    price: 25000,
    unit: '',
    reference_min: null,
    reference_max: null,
    reference_ranges: {},
    active: true,
    sort_order: 2,
  },
];

function renderPage() {
  return render(
    <AppThemeProvider>
      <LabTestsCatalogPage />
    </AppThemeProvider>,
  );
}

describe('LabTestsCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while fetching', () => {
    service.getLabTests.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    // Loading is a grid of 6 Skeletons (no text)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(6);
    expect(screen.getByPlaceholderText('lab_catalog:searchPlaceholder')).toBeInTheDocument();
  });

  it('renders the catalog of tests after loading', async () => {
    service.getLabTests.mockResolvedValue(tests);
    renderPage();
    expect(await screen.findByText('Hemograma')).toBeInTheDocument();
    expect(screen.getByText('HEM001')).toBeInTheDocument();
    expect(screen.getByText('Perfil Tiroideo')).toBeInTheDocument();
    expect(screen.getByText('HOR001')).toBeInTheDocument();
  });

  it('renders the error alert when the request fails', async () => {
    service.getLabTests.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('lab_catalog:errorLoading')).toBeInTheDocument();
  });

  it('renders the empty state when there are no tests', async () => {
    service.getLabTests.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('lab_catalog:noResults')).toBeInTheDocument();
  });

  it('filters tests by the search term', async () => {
    service.getLabTests.mockResolvedValue(tests);
    renderPage();
    await screen.findByText('Hemograma');
    fireEvent.change(screen.getByPlaceholderText('lab_catalog:searchPlaceholder'), {
      target: { value: 'tiroideo' },
    });
    expect(screen.queryByText('Hemograma')).not.toBeInTheDocument();
    expect(screen.getByText('Perfil Tiroideo')).toBeInTheDocument();
  });

  it('filters tests by category', async () => {
    service.getLabTests.mockResolvedValue(tests);
    renderPage();
    await screen.findByText('Hemograma');
    // Category chips render as "Name (count)"; HEM prefix maps to "Hematología"
    fireEvent.click(screen.getByRole('button', { name: /Hematolog/ }));
    expect(screen.queryByText('Perfil Tiroideo')).not.toBeInTheDocument();
    expect(screen.getByText('Hemograma')).toBeInTheDocument();
  });
});
