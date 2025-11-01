'use client';

import { useEffect, useState } from 'react';
import enDict from './dictionaries/en';
import ruDict from './dictionaries/ru';

type Dictionary = typeof enDict | typeof ruDict;

const dictionaries = {
  en: enDict,
  ru: ruDict,
};

// Функция для получения локали из cookie
function getLocaleFromCookie(): 'en' | 'ru' {
  if (typeof document === 'undefined') return 'en';
  
  const savedLocale = document.cookie
    .split('; ')
    .find(row => row.startsWith('NEXT_LOCALE='))
    ?.split('=')[1] as 'en' | 'ru' | undefined;
  
  return savedLocale || 'en';
}

export function useTranslation() {
  // Инициализируем сразу с правильной локалью
  const [locale, setLocale] = useState<'en' | 'ru'>(() => {
    if (typeof window === 'undefined') return 'en';
    return getLocaleFromCookie();
  });
  
  const [dict, setDict] = useState<Dictionary>(() => {
    if (typeof window === 'undefined') return enDict;
    const initialLocale = getLocaleFromCookie();
    return dictionaries[initialLocale] as Dictionary;
  });

  useEffect(() => {
    // Проверяем еще раз после монтирования
    const currentLocale = getLocaleFromCookie();
    if (currentLocale !== locale) {
      setLocale(currentLocale);
      setDict(dictionaries[currentLocale] as Dictionary);
    }
  }, [locale]);

  const changeLocale = (newLocale: 'en' | 'ru') => {
    setLocale(newLocale);
    setDict(dictionaries[newLocale] as Dictionary);
    
    // Сохраняем в cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    
    // Перезагружаем страницу для применения изменений
    window.location.reload();
  };

  return { t: dict as typeof enDict, locale, changeLocale };
}
