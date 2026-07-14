import { render, screen } from '@testing-library/react';
import NotFoundPage from '../../pages/NotFoundPage';

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'not_found.title': 'Page Not Found',
        'not_found.message': 'The page you are looking for does not exist.',
        'not_found.go_home': 'Go Home',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('../../components/ui/Button', () => ({
  default: (props: any) => <button {...props} />,
}));

vi.mock('../../components/ui/PageContainer', () => ({
  PageContainer: ({ children, ...props }: any) => <div data-testid="page-container" {...props}>{children}</div>,
}));

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders translated title', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders translated message', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
  });

  it('renders home link', () => {
    render(<NotFoundPage />);
    const link = screen.getByText('Go Home');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });
});
