import ruLocale from './locales/ru.json';
import enLocale from './locales/en.json';

export type Language = 'ru' | 'en';

export const locales = {
  ru: ruLocale,
  en: enLocale
} as const;

// Тип для вложенных ключей в виде 'common.close' | 'welcome.title' и т.д.
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof ruLocale>;

/**
 * Извлекает строку перевода по составному ключу (например 'welcome.title')
 */
export function getTranslationString(localeData: Record<string, any>, key: string): string {
  const parts = key.split('.');
  let current: any = localeData;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key; // Fallback на сам ключ, если перевод не найден
    }
  }
  return typeof current === 'string' ? current : key;
}

/**
 * Подставляет параметры в строку шаблона: "Привет, {name}!" -> "Привет, Ник!"
 */
export function formatTranslation(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, matchKey) => {
    return params[matchKey] !== undefined ? String(params[matchKey]) : `{${matchKey}}`;
  });
}
