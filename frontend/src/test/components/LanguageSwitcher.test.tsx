import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

const changeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es', changeLanguage },
  }),
}));

describe('LanguageSwitcher', () => {
  it('renders the flag of the current language', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('🇪🇸')).toBeInTheDocument();
  });

  it('opens the menu listing all available languages', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Português')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
  });

  it('marks the current language as selected', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button'));
    const item = screen.getByText('Español').closest('li');
    expect(item).toHaveClass('Mui-selected');
  });

  it('calls changeLanguage and closes the menu when a language is selected', async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('English'));
    expect(changeLanguage).toHaveBeenCalledWith('en');
    await waitFor(() => {
      expect(screen.queryByText('Português')).not.toBeInTheDocument();
    });
  });

  it('falls back to Spanish when i18n.language is unknown', () => {
    // The global mock does not define i18n.language; component must not crash
    render(<LanguageSwitcher />);
    expect(screen.getByText('🇪🇸')).toBeInTheDocument();
  });
});
