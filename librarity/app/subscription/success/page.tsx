'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, XCircle, Sparkles, Crown, BookOpen, Zap } from 'lucide-react';
import api from '@/lib/api';

export default function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Проверяем вашу подписку...');
  const [subscription, setSubscription] = useState<{ subscription_tier?: string; subscription_status?: string; tokens_remaining?: number; max_tokens?: number } | null>(null);
  const [countdown, setCountdown] = useState(5);
  const checkoutId = searchParams.get('checkout_id');

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        if (!checkoutId) {
          setStatus('error');
          setMessage('Неверная сессия оплаты');
          return;
        }

        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check subscription status
        const subscriptionData = await api.getSubscription();
        
        if (subscriptionData && subscriptionData.tier !== 'free') {
          setStatus('success');
          setSubscription(subscriptionData);
          setMessage(`Поздравляем! Вы успешно перешли на тариф ${subscriptionData.tier.toUpperCase()}!`);
          
          // Start countdown
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                router.push('/');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          return () => clearInterval(interval);
        } else {
          // Still processing, check again
          setTimeout(verifySubscription, 2000);
        }
      } catch (error) {
        console.error('Error verifying subscription:', error);
        setStatus('error');
        setMessage('Не удалось проверить подписку. Пожалуйста, обновите страницу или обратитесь в поддержку.');
      }
    };

    verifySubscription();
  }, [checkoutId, router]);

  const getTierFeatures = (tier: string) => {
    if (tier === 'pro') {
      return [
        { icon: BookOpen, text: 'До 5 книг' },
        { icon: Zap, text: '20,000 токенов' },
        { icon: Sparkles, text: 'Citation & Coach режимы' },
      ];
    } else if (tier === 'ultimate') {
      return [
        { icon: BookOpen, text: 'Неограниченно книг' },
        { icon: Zap, text: '100,000 токенов' },
        { icon: Sparkles, text: 'Все режимы + Аналитика' },
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-6"
              >
                <Loader2 className="w-16 h-16 text-pink-500" />
              </motion.div>
              
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2"
              >
                <Sparkles className="w-6 h-6 text-pink-400" />
              </motion.div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Обрабатываем платеж</h1>
            <p className="text-gray-600">{message}</p>
            
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 bg-pink-500 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}

        {status === 'success' && subscription && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative mx-auto w-24 h-24 mb-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
              
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2"
              >
                <div className="w-full h-full rounded-full border-4 border-dashed border-pink-300 opacity-50" />
              </motion.div>
            </motion.div>

            {/* Success Message */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                <Crown className="w-8 h-8 text-yellow-500" />
                Оплата успешна!
                <Crown className="w-8 h-8 text-yellow-500" />
              </h1>
              <p className="text-gray-600">{message}</p>
            </div>

            {/* Tier Badge */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 mb-6 text-white text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-2xl font-bold uppercase">{subscription.subscription_tier}</h2>
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-pink-100">Теперь у вас есть доступ ко всем возможностям!</p>
            </motion.div>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {getTierFeatures(subscription.subscription_tier || 'free').map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Countdown */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Автоматический переход на главную через{' '}
                <span className="font-bold text-pink-600">{countdown}</span> сек
              </p>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Перейти к книгам
              </button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка проверки</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-600 transition-colors"
              >
                Обновить страницу
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Вернуться на главную
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
