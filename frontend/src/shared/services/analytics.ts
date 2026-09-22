import { getCookieConsent } from '@/shared/components/cookies/ConsentBanner';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function getMeasurementId(): string | undefined {
  return import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
}

function gtag(...args: unknown[]): void {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }
}

export function initAnalytics(): void {
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag = function (...args: unknown[]) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  };

  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });
}

function consentEnabled(): boolean {
  const consent = getCookieConsent();
  return consent !== null && consent.analytics === true;
}

export function trackPageView(path: string): void {
  if (!getMeasurementId() || !consentEnabled()) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!getMeasurementId() || !consentEnabled()) return;
  gtag('event', eventName, params);
}