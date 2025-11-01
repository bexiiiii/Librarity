import { NextRequest, NextResponse } from 'next/server';

// Страны СНГ, где используется русский язык
const CIS_COUNTRIES = [
  'KZ', // Казахстан
  'RU', // Россия
  'BY', // Беларусь
  'UZ', // Узбекистан
  'KG', // Кыргызстан
  'TJ', // Таджикистан
  'AM', // Армения
  'AZ', // Азербайджан
  'MD', // Молдова
  'TM', // Туркменистан
];

function getLocaleFromCountry(country: string | null): string {
  if (!country) return 'en';
  
  // Если страна из СНГ - русский язык
  if (CIS_COUNTRIES.includes(country.toUpperCase())) {
    return 'ru';
  }
  
  // Для остальных - английский
  return 'en';
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Пропускаем статические файлы и API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|otf)$/)
  ) {
    return NextResponse.next();
  }

  // Определяем локаль
  let locale = 'en';
  
  // 1. Проверяем cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && ['en', 'ru'].includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // 2. Определяем по стране из Cloudflare или Vercel геолокации
    const country = 
      request.headers.get('cf-ipcountry') || // Cloudflare
      request.headers.get('x-vercel-ip-country') || // Vercel
      null;
    
    if (country) {
      locale = getLocaleFromCountry(country);
    } else {
      // 3. Fallback на Accept-Language заголовок
      const acceptLanguage = request.headers.get('accept-language');
      if (acceptLanguage && acceptLanguage.includes('ru')) {
        locale = 'ru';
      }
    }
  }

  const response = NextResponse.next();
  
  // Сохраняем локаль в cookie на 1 год
  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  
  return response;
}

export const config = {
  matcher: [
    // Применяем middleware ко всем путям, кроме:
    '/((?!_next|api|static|.*\\..*|favicon.ico).*)',
  ],
};
