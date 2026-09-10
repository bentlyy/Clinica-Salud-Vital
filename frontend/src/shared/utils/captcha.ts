export const RECAPTCHA_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export const isTestCaptcha = import.meta.env.DEV;

export function getRecaptchaSiteKey(): string | undefined {
  if (import.meta.env.DEV) return RECAPTCHA_TEST_SITE_KEY;
  return import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
}

export const RECAPTCHA_SITE_KEY = getRecaptchaSiteKey();