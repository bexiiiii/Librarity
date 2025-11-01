'use client';

import { useTranslation } from '@/i18n/use-translation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * Пример компонента с мультиязычностью
 * 
 * Этот компонент демонстрирует использование системы i18n:
 * - Автоматическое определение языка по геолокации
 * - Переключение языка вручную
 * - Доступ к переводам через хук useTranslation
 */
export function WelcomeBanner() {
  const { t, locale } = useTranslation();

  return (
    <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 text-white p-8 rounded-lg">
      {/* Переключатель языка в правом верхнем углу */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">
          {t.landing.welcome}{' '}
          <span className="font-[family-name:var(--font-advercase)]">
            Lexent AI
          </span>
        </h1>
        
        <p className="text-xl mb-2">
          {t.landing.subtitle}
        </p>
        
        <p className="text-lg opacity-90">
          {t.landing.description}
        </p>
        
        <div className="mt-6">
          <button className="bg-white text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            {t.landing.cta}
          </button>
        </div>

        {/* Индикатор текущего языка */}
        <div className="mt-4 text-sm opacity-75">
          {locale === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
        </div>
      </div>
    </div>
  );
}

/**
 * Пример использования в форме авторизации
 */
export function LoginFormExample() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">{t.auth.login}</h2>
      
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t.auth.email}
          </label>
          <input
            type="email"
            placeholder={t.auth.email}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t.auth.password}
          </label>
          <input
            type="password"
            placeholder={t.auth.password}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors"
        >
          {t.auth.loginButton}
        </button>

        <button
          type="button"
          className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.auth.googleAuth}
        </button>

        <p className="text-center text-sm">
          {t.auth.noAccount}{' '}
          <a href="#" className="text-pink-600 hover:underline">
            {t.auth.register}
          </a>
        </p>
      </form>
    </div>
  );
}
