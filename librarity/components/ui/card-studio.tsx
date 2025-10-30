'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

interface CardDemoProps {
  onSuccess?: () => void;
}

const CardDemo = ({ onSuccess }: CardDemoProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
          setError('Пароли не совпадают');
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
        (mode === 'login' ? 'Ошибка входа. Проверьте данные.' : 'Ошибка регистрации. Попробуйте снова.');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className='w-full border-0 shadow-none bg-transparent'>
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}</CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Введите свой email для входа в аккаунт' 
            : 'Введите данные для создания нового аккаунта'}
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
                <Label htmlFor='fullName'>Полное имя</Label>
                <Input 
                  id='fullName' 
                  type='text' 
                  placeholder='Иван Иванов'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
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
                <Label htmlFor='password'>Пароль</Label>
                {mode === 'login' && (
                  <a href='#' className='ml-auto inline-block text-sm underline-offset-4 hover:underline'>
                    Забыли пароль?
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
                placeholder={mode === 'register' ? 'Минимум 6 символов' : ''}
              />
            </div>
            
            {mode === 'register' && (
              <div className='grid gap-2'>
                <Label htmlFor='confirmPassword'>Подтвердите пароль</Label>
                <Input 
                  id='confirmPassword' 
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder='Повторите пароль'
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
                ? (mode === 'login' ? 'Вход...' : 'Регистрация...') 
                : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
            </Button>
            <Button variant='outline' className='w-full' type='button' disabled={isLoading}>
              {mode === 'login' ? 'Войти через Google' : 'Регистрация через Google'}
            </Button>
            <div className='mt-4 text-center text-sm'>
              {mode === 'login' ? (
                <>
                  Нет аккаунта?{' '}
                  <button 
                    type='button'
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className='underline underline-offset-4 hover:text-[#ff4ba8]'
                  >
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{' '}
                  <button 
                    type='button'
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className='underline underline-offset-4 hover:text-[#ff4ba8]'
                  >
                    Войти
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
