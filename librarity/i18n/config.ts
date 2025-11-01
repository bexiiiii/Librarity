export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'ru'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

// Страны, где используется русский язык
export const russianSpeakingCountries = [
  'KZ', // Казахстан
  'RU', // Россия
  'BY', // Беларусь
  'KG', // Кыргызстан
  'TJ', // Таджикистан
  'UZ', // Узбекистан
  'TM', // Туркменистан
  'AM', // Армения
  'AZ', // Азербайджан
  'MD', // Молдова
  'GE', // Грузия
];

export function getLocaleFromCountry(country?: string): Locale {
  if (!country) return i18n.defaultLocale;
  
  return russianSpeakingCountries.includes(country.toUpperCase()) 
    ? 'ru' 
    : 'en';
}
