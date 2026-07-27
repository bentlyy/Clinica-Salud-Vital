import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlaceholderPage from '@/shared/components/ui/PlaceholderPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        placeholder_coming_soon: 'Este modulo sera implementado proximamente.',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

describe('PlaceholderPage', () => {
  it('renders the title', () => {
    render(<PlaceholderPage title="Billing Module" />);
    expect(screen.getByText('Billing Module')).toBeInTheDocument();
  });

  it('renders the coming soon description', () => {
    render(<PlaceholderPage title="Reports" />);
    expect(screen.getByText('Este modulo sera implementado proximamente.')).toBeInTheDocument();
  });

  it('renders the Construction icon', () => {
    const { container } = render(<PlaceholderPage title="Reports" />);
    const icon = container.querySelector('.MuiSvgIcon-root');
    expect(icon).toBeInTheDocument();
  });

  it('renders inside a Paper component', () => {
    const { container } = render(<PlaceholderPage title="Reports" />);
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('renders with different titles', () => {
    render(<PlaceholderPage title="Notifications" />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
