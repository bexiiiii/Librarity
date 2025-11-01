'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Получаем параметры из URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Проверяем на ошибки от Google
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // Проверяем наличие кода
        if (!code) {
          throw new Error('Authorization code not found');
        }

        // Проверяем state для защиты от CSRF
        if (typeof window !== 'undefined') {
          const savedState = localStorage.getItem('oauth_state');
          
          if (!state || state !== savedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
          }
          
          // Удаляем использованный state
          localStorage.removeItem('oauth_state');
        }

        // Обмениваем код на токены
        const response = await api.handleGoogleCallback(code, state || '');
        
        // Проверяем успешность авторизации
        if (response.access_token) {
          // Проверяем, был ли вызов из модалки
          const wasModal = typeof window !== 'undefined' 
            ? localStorage.getItem('oauth_modal') === 'true' 
            : false;
          
          if (wasModal && typeof window !== 'undefined') {
            localStorage.removeItem('oauth_modal');
            // Закрываем окно для модалки (если открыто в popup)
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_success' }, '*');
              window.close();
            } else {
              // Если не popup, перенаправляем на главную
              router.push('/');
            }
          } else {
            // Обычная авторизация - перенаправляем на главную
            router.push('/');
          }
        } else {
          throw new Error('No access token received');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        setIsProcessing(false);
        
        // Перенаправляем на главную с ошибкой через 3 секунды
        setTimeout(() => {
          router.push('/?error=auth_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {isProcessing ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4ba8] mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Авторизация...
            </h2>
            <p className="text-gray-600">
              Пожалуйста, подождите. Мы завершаем процесс входа.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ошибка авторизации
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Перенаправление на главную страницу...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
