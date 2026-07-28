import { describe, it, expect } from 'vitest';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';
import pt from '../i18n/locales/pt.json';
import fr from '../i18n/locales/fr.json';

/**
 * Utility: flatten nested JSON object to dot-notation keys
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys.push(...flattenKeys(obj[key] as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n locale key parity', () => {
  const esKeys = flattenKeys(es).sort();
  const locales = { en, pt, fr };

  Object.entries(locales).forEach(([lang, translations]) => {
    it(`should have same keys as es.json in ${lang}.json`, () => {
      const localeKeys = flattenKeys(translations).sort();
      const missingInLocale = esKeys.filter((k) => !localeKeys.includes(k));
      const extraInLocale = localeKeys.filter((k) => !esKeys.includes(k));

      expect(
        missingInLocale,
        `Keys missing in ${lang}.json: ${missingInLocale.join(', ')}`
      ).toHaveLength(0);

      expect(
        extraInLocale,
        `Extra keys in ${lang}.json: ${extraInLocale.join(', ')}`
      ).toHaveLength(0);
    });
  });
});
