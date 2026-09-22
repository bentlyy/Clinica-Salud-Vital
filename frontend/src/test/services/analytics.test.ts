import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackPageView, trackEvent } from '@/shared/services/analytics';

vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-XXXXXXXXXX');

const originalGtag = vi.fn();

function setConsent(analytics: boolean): void {
  window.localStorage.setItem('vitaria_cookie_consent', JSON.stringify({ analytics }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.dataLayer = [];
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag = originalGtag;
  originalGtag.mockClear();
});

afterEach(() => {
  window.localStorage.clear();
  window.dataLayer = undefined;
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag = undefined;
});

describe('trackPageView', () => {
  it('pushes page_view when analytics consented', () => {
    setConsent(true);
    trackPageView('/login');
    expect(originalGtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({ page_path: '/login' }));
  });

  it('does nothing without consent', () => {
    setConsent(false);
    trackPageView('/login');
    expect(originalGtag).not.toHaveBeenCalled();
  });

  it('falls back to dataLayer when gtag is not attached', () => {
    setConsent(true);
    (window as unknown as { gtag?: unknown }).gtag = undefined;
    window.dataLayer = [];
    trackPageView('/home');
    expect(window.dataLayer).toContainEqual(expect.arrayContaining(['event', 'page_view']));
  });
});

describe('trackEvent', () => {
  it('sends custom event when analytics consented', () => {
    setConsent(true);
    trackEvent('download', { file: 'sitemap.xml' });
    expect(originalGtag).toHaveBeenCalledWith('event', 'download', expect.objectContaining({ file: 'sitemap.xml' }));
  });

  it('does nothing without consent', () => {
    setConsent(false);
    trackEvent('download');
    expect(originalGtag).not.toHaveBeenCalled();
  });
});