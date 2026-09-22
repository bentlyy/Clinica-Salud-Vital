import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

const ROUTE_TITLES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\/$/, key: 'seo:title.home' },
  { pattern: /^\/contratar/, key: 'seo:title.contratar' },
  { pattern: /^\/privacidad/, key: 'seo:title.privacy' },
  { pattern: /^\/terminos/, key: 'seo:title.terms' },
  { pattern: /^\/gracias/, key: 'seo:title.thanks' },
  { pattern: /^\/booking/, key: 'seo:title.booking' },
  { pattern: /^\/register/, key: 'seo:title.register' },
  { pattern: /^\/login/, key: 'seo:title.login' },
  { pattern: /^\/forgot-password/, key: 'seo:title.forgot' },
  { pattern: /^\/confirm\//, key: 'seo:title.confirm' },
  { pattern: /^\/2fa/, key: 'seo:title.twofa' },
  { pattern: /^\/dashboard/, key: 'seo:title.dashboard' },
  { pattern: /^\/patient\//, key: 'seo:title.dashboard' },
  { pattern: /^\/doctors/, key: 'seo:title.doctors' },
  { pattern: /^\/bookings/, key: 'seo:title.bookings' },
  { pattern: /^\/availability/, key: 'seo:title.availability' },
  { pattern: /^\/calendar/, key: 'seo:title.calendar' },
  { pattern: /^\/patients/, key: 'seo:title.patients' },
  { pattern: /^\/clinical/, key: 'seo:title.clinical' },
  { pattern: /^\/management/, key: 'seo:title.management' },
  { pattern: /^\/laboratory/, key: 'seo:title.lab' },
  { pattern: /^\/billing/, key: 'seo:title.billing' },
  { pattern: /^\/users/, key: 'seo:title.users' },
  { pattern: /^\/tenants/, key: 'seo:title.tenants' },
  { pattern: /^\/super-admin/, key: 'seo:title.superadmin' },
  { pattern: /^\/analytics/, key: 'seo:title.analytics' },
  { pattern: /^\/reports/, key: 'seo:title.reports' },
  { pattern: /^\/audit/, key: 'seo:title.audit' },
  { pattern: /^\/settings/, key: 'seo:title.settings' },
  { pattern: /^\/notifications/, key: 'seo:title.notifications' },
  { pattern: /^\/saas/, key: 'seo:title.saas' },
  { pattern: /^\/specialties/, key: 'seo:title.specialties' },
  { pattern: /^\/holidays/, key: 'seo:title.holidays' },
];

export function DocumentTitle() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const match = ROUTE_TITLES.find(({ pattern }) => pattern.test(pathname));
  usePageTitle(match ? t(match.key) : undefined);
  return null;
}