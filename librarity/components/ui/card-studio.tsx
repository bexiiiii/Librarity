'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/use-translation'

interface CardDemoProps {
  onSuccess?: () => void;
}

const CardDemo = ({ onSuccess }: CardDemoProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.initGoogleOAuth();
      const { auth_url, state } = response;
      
      // Сохраняем state для проверки CSRF
      if (typeof window !== 'undefined') {
        localStorage.setItem('oauth_state', state);
        // Сохраняем информацию о том, что мы в модалке
        if (onSuccess) {
          localStorage.setItem('oauth_modal', 'true');
        }
        // Перенаправляем на Google
        window.location.href = auth_url;
      }
    } catch (err: any) {
      setError(t.auth.googleError);
      setIsLoading(false);
    }
  };

    const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const response = await api.login(email, password);
        // Если передан onSuccess, вызываем его (используется в модалке)
        if (onSuccess) {
          onSuccess();
        } else {
          // Иначе перезагружаем страницу (используется на странице логина)
          router.refresh();
          window.location.reload();
        }
      } else {
        // Регистрация
        if (password !== confirmPassword) {
          setError(t.auth.passwordMismatch);
          setIsLoading(false);
          return;
        }
        const regResponse = await api.register({ email, password, full_name: fullName });
        // После успешной регистрации автоматически логинимся
        const loginResponse = await api.login(email, password);
        // Если передан onSuccess, вызываем его (используется в модалке)
        if (onSuccess) {
          onSuccess();
        } else {
          // Иначе перезагружаем страницу (используется на странице логина)
          router.refresh();
          window.location.reload();
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 
        (mode === 'login' ? t.auth.loginError : t.auth.registerError);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className='w-full border-0 shadow-none bg-transparent'>
      <CardHeader>
        <CardTitle>{mode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}</CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? t.auth.loginDescription
            : t.auth.registerDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuthSubmit}>
          <div className='flex flex-col gap-6'>
            {error && (
              <div className='p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900'>
                {error}
              </div>
            )}
            
            {mode === 'register' && (
              <div className='grid gap-2'>
                <Label htmlFor='fullName'>{t.auth.fullName}</Label>
                <Input 
                  id='fullName' 
                  type='text' 
                  placeholder={t.auth.fullName}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div className='grid gap-2'>
              <Label htmlFor='email'>{t.auth.email}</Label>
              <Input 
                id='email' 
                type='email' 
                placeholder='m@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className='grid gap-2'>
              <div className='flex items-center'>
                <Label htmlFor='password'>{t.auth.password}</Label>
                {mode === 'login' && (
                  <a href='#' className='ml-auto inline-block text-sm underline-offset-4 hover:underline'>
                    {t.auth.forgotPassword}
                  </a>
                )}
              </div>
              <Input 
                id='password' 
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder={mode === 'register' ? t.auth.password : ''}
              />
            </div>
            
            {mode === 'register' && (
              <div className='grid gap-2'>
                <Label htmlFor='confirmPassword'>{t.auth.confirmPassword}</Label>
                <Input 
                  id='confirmPassword' 
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder={t.auth.confirmPassword}
                />
              </div>
            )}
          </div>
          <CardFooter className='flex-col gap-2 px-0 pt-6'>
            <Button 
              type='submit' 
              className='w-full bg-[#ff4ba8] hover:bg-[#ff0084] text-white'
              disabled={isLoading}
            >
              {isLoading 
                ? (mode === 'login' ? t.auth.loggingIn : t.auth.registering) 
                : (mode === 'login' ? t.auth.loginButton : t.auth.registerButton)}
            </Button>
            <Button 
              variant='outline' 
              className='w-full' 
              type='button' 
              disabled={isLoading}
              onClick={handleGoogleAuth}
            >
              {t.auth.googleAuth}
            </Button>
            <div className='mt-4 text-center text-sm'>
              {mode === 'login' ? (
                <>
                  {t.auth.noAccount}{' '}
                  <button 
                    type='button'
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className='underline underline-offset-4 hover:text-[#ff4ba8]'
                  >
                    {t.auth.register}
                  </button>
                </>
              ) : (
                <>
                  {t.auth.hasAccount}{' '}
                  <button 
                    type='button'
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className='underline underline-offset-4 hover:text-[#ff4ba8]'
                  >
                    {t.auth.login}
                  </button>
                </>
              )}
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}

export default CardDemo
